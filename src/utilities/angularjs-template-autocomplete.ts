import { FileParser } from './file-parser.utility';
import * as vscode from 'vscode';
import * as ts from 'typescript';
import { ControllerOptions } from '../models/controller-options.model';
import { HtmlValidator } from './html-validator.utility';

/**
 * Class used to get all template auto-complete properties from the controller.
 *
 * @export
 * @class AngularJSTemplateAutocomplete
 */
export class AngularJSTemplateAutocomplete {


    /**
     * Controller node that is tied to the html template
     *
     * @private
     * @type {(ts.Node | undefined)}
     * @memberof AngularJSTemplateAutocomplete
     */
    private controllerNode: ts.Node | undefined;

    /**
     * Controller options used to figure out properties of the controller
     *
     * @private
     * @type {ControllerOptions}
     * @memberof AngularJSTemplateAutocomplete
     */
    private controllerOptions: ControllerOptions = new ControllerOptions();

    /**
     * File parser create a typescript tree from directory files
     *
     * @private
     * @type {FileParser}
     * @memberof AngularJSTemplateAutocomplete
     */
    private fileParser: FileParser = new FileParser(this.document);

    /**
     * Used to validate various things in the html template
     *
     * @private
     * @type {HtmlValidator}
     * @memberof AngularJSTemplateAutocomplete
     */
    private htmlValidator: HtmlValidator = new HtmlValidator(this.document, this.position);

    constructor(private document: vscode.TextDocument, private position: vscode.Position) {
        this.activate();
    }

    /**
     * Activate the class by creatingn controller options by using the html template name.
     * Then using those options to get the node of the controller.
     *
     * @private
     * @memberof AngularJSTemplateAutocomplete
     */
    private activate(): void {
        this.controllerOptions = this.fileParser.searchNodeChildrenFromFilesForControllerOptions(this.document.fileName) as ControllerOptions;
        if (this.controllerOptions) {
            this.controllerNode = this.fileParser.getTemplateControllerNode(this.controllerOptions.controller);
        }
    }

    /**
     * Set the completion items
     *
     * @param {vscode.CompletionItem[]} items
     * @returns {void}
     * @memberof AngularJSTemplateAutocomplete
     */
    public setCompletionItems(items: vscode.CompletionItem[]): void {
        if (this.htmlValidator.isInsideInterpolation() && this.isAutocompleteAvailable) {
            const interpolationText: string = this.htmlValidator.getInterpolationText();
            let interpolationProperties: string[] = interpolationText.split('.');
            if (interpolationProperties.length === 1) {
                items.push(new vscode.CompletionItem(this.controllerOptions.controllerAs));
            } else if (interpolationProperties.length === 2 && interpolationProperties[0] === this.controllerOptions.controllerAs) {
                this.setSecondLevelProperties(items);
            } else if (interpolationProperties.length >= 3) {
                if (interpolationProperties[0] !== this.controllerOptions.controllerAs) {
                    return;
                }

                let controllerPropertyString: string = interpolationProperties[1];
                controllerPropertyString = this.htmlValidator.stripParenthesisFromProperty(controllerPropertyString);

                let secondNode: ts.Identifier | undefined;
                if (controllerPropertyString && this.controllerNode) {
                    this.controllerNode.forEachChild((node: ts.Node) => {
                        if ((node as any).name && (node as any).name.escapedText && controllerPropertyString === (node as any).name.escapedText) {
                            secondNode = node as ts.Identifier;
                        }
                    });
                }
                if (secondNode) {
                    interpolationProperties = this.createPropertiesArray(interpolationProperties);
                    if (ts.isPropertyDeclaration(secondNode) || ts.isMethodDeclaration(secondNode)) {
                        if (secondNode && secondNode.type) {
                            if (ts.isTypeNode(secondNode.type)) {
                                try {
                                    this.setCompletionPropertiesOfLastNode(interpolationProperties, secondNode.type, items);
                                } catch (error) {
                                    console.log(error);
                                }
                            }
                        }
                    }

                }
            }
        }
    }

    /**
     * Reverse the interpolation properties and then remove the uneeded controller and second level property.
     *
     * @private
     * @param {string[]} interpolationProperties
     * @returns {string[]}
     * @memberof AngularJSTemplateAutocomplete
     */
    private createPropertiesArray(interpolationProperties: string[]): string[] {
        interpolationProperties = interpolationProperties.reverse();
        interpolationProperties.pop();
        interpolationProperties.pop();
        return interpolationProperties;
    }

    /**
     * Recursively traverse the interpolation properties to get the last property types for completion
     *
     * @private
     * @param {string[]} interpolationProperties
     * @param {ts.TypeNode} typeNode
     * @param {vscode.CompletionItem[]} items
     * @memberof AngularJSTemplateAutocomplete
     */
    private setCompletionPropertiesOfLastNode(interpolationProperties: string[], typeNode: ts.TypeNode, items: vscode.CompletionItem[]): void {
        const lastProperty: string | undefined = this.htmlValidator.stripParenthesisFromProperty(interpolationProperties.pop() as string);
        if (!lastProperty) {
            if (this.fileParser.checker) {
                const type: ts.Type = this.fileParser.checker.getTypeFromTypeNode(typeNode);
                const properties: ts.Symbol[] = this.fileParser.checker.getPropertiesOfType(type);
                for (const property of properties) {
                    const item: vscode.CompletionItem = new vscode.CompletionItem(property.escapedName.toString());
                    if (property.flags === ts.SymbolFlags.Method) {
                        item.kind = vscode.CompletionItemKind.Method;
                        item.documentation = this.fileParser.serializeSymbol(property);
                    } else {
                        item.kind = vscode.CompletionItemKind.Property;
                    }
                    items.push(item);
                }
            }
        } else {
            if (this.fileParser.checker) {
                const type: ts.Type = this.fileParser.checker.getTypeFromTypeNode(typeNode);
                const properties: ts.Symbol[] = this.fileParser.checker.getPropertiesOfType(type);
                let propertyToFind: ts.Symbol | undefined;
                for (const property of properties) {
                    if (property.escapedName.toString() === lastProperty) {
                        propertyToFind = property;
                        this.setCompletionPropertiesOfLastNode(interpolationProperties, (propertyToFind.valueDeclaration as any).type, items);
                    }
                }
            }
        }
    }

    /**
     * Set the second completions properties
     *
     * @private
     * @param {vscode.CompletionItem[]} items
     * @memberof AngularJSTemplateAutocomplete
     */
    private setSecondLevelProperties(items: vscode.CompletionItem[]): void {
        if (this.controllerNode) {
            this.controllerNode.forEachChild((node: ts.Node) => {
                if ((node as any).name && (node as any).name.escapedText) {
                    if (ts.isPropertyDeclaration(node)) {
                        const item: vscode.CompletionItem = new vscode.CompletionItem((node as any).name.escapedText);
                        item.kind = vscode.CompletionItemKind.Property;
                        items.push(item);
                    }
                    if (ts.isMethodDeclaration(node)) {
                        const item: vscode.CompletionItem = new vscode.CompletionItem((node as any).name.escapedText);
                        item.kind = vscode.CompletionItemKind.Method;
                        item.documentation = this.getDocumentationFromNode(node);
                        items.push(item);
                    }
                }
            });
        }
    }

    /**
     * Get documentation for a method
     *
     * @private
     * @param {ts.MethodDeclaration} node
     * @returns {string}
     * @memberof AngularJSTemplateAutocomplete
     */
    private getDocumentationFromNode(node: ts.MethodDeclaration): string {
        let docs: string = '';
        if (this.fileParser.checker) {
            const symbol: ts.Symbol | undefined = this.fileParser.checker.getSymbolAtLocation(node.name);
            if (symbol) {
                docs = this.fileParser.serializeSymbol(symbol);
            }
        }
        return docs;
    }

    /**
     * Determine if auto complete is availabe in the template file
     *
     * @readonly
     * @type {boolean}
     * @memberof AngularJSTemplateAutocomplete
     */
    public get isAutocompleteAvailable(): boolean {
        return this.controllerNode ? true : false;
    }



}