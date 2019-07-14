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
     * Determine if auto complete is availabe in the template file
     *
     * @readonly
     * @type {boolean}
     * @memberof AngularJSTemplateAutocomplete
     */
    public get isAutocompleteAvailable(): boolean {
        return this.controllerNode ? true : false;
    }


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
    private readonly fileParser: FileParser = new FileParser(this.document);

    /**
     * Used to validate various things in the html template
     *
     * @private
     * @type {HtmlValidator}
     * @memberof AngularJSTemplateAutocomplete
     */
    private readonly htmlValidator: HtmlValidator = new HtmlValidator(this.document, this.position);

    constructor(private readonly document: vscode.TextDocument, private readonly position: vscode.Position) {
        this.activate();
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
                const controllerItem: vscode.CompletionItem = new vscode.CompletionItem(this.controllerOptions.controllerAs);
                controllerItem.kind = vscode.CompletionItemKind.Class;
                controllerItem.documentation = this.controllerOptions.controller;
                items.push(controllerItem);
            } else if (interpolationProperties.length === 2 && interpolationProperties[0] === this.controllerOptions.controllerAs) {
                this.setSecondLevelProperties(items);
            } else if (interpolationProperties.length >= 3) {
                if (interpolationProperties[0] !== this.controllerOptions.controllerAs) {
                    return;
                }

                let controllerPropertyString: string = interpolationProperties[1];
                controllerPropertyString = this.htmlValidator.stripParenthesisFromProperty(controllerPropertyString);

                let secondNode: ts.Declaration | undefined;
                if (controllerPropertyString && this.controllerNode && this.fileParser.checker) {
                    const properties: ts.Symbol[] = this.getTypeProperties(this.controllerNode);
                    for (const property of properties) {
                        if (property.name && controllerPropertyString === property.name) {
                            secondNode = property.valueDeclaration;
                        }
                    }
                }
                if (secondNode) {
                    interpolationProperties = this.createPropertiesArray(interpolationProperties);
                    if (secondNode && (secondNode as any).type) {
                        if (ts.isTypeNode((secondNode as any).type)) {
                            try {
                                this.setCompletionPropertiesOfLastNode(interpolationProperties, (secondNode as any).type, items);
                            } catch (error) {
                                console.log(error);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Get all the properties from type properties from a node
     *
     * @private
     * @param {ts.Node} node
     * @returns {ts.Symbol[]}
     * @memberof AngularJSTemplateAutocomplete
     */
    private getTypeProperties(node: ts.Node): ts.Symbol[] {
        if (this.fileParser.checker) {
            const controllerType: ts.Type = this.fileParser.checker.getTypeAtLocation(node);
            const properties: ts.Symbol[] = this.fileParser.checker.getPropertiesOfType(controllerType);
            return properties;
        }
        return [];
    }

    /**
     * Activate the class by creatingn controller options by using the html template name.
     * Then using those options to get the node of the controller.
     *
     * @private
     * @memberof AngularJSTemplateAutocomplete
     */
    private activate(): void {
        this.controllerOptions = this.fileParser.searchSourceFilesForController(this.document.fileName) as ControllerOptions;
        if (this.controllerOptions) {
            this.controllerNode = this.fileParser.getTemplateControllerNode(this.controllerOptions.controller);
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
                const properties: ts.Symbol[] = this.getTypeProperties(typeNode);
                this.setCompletionProperties(properties, items);
            }
        } else {
            if (this.fileParser.checker) {
                const properties: ts.Symbol[] = this.getTypeProperties(typeNode);
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
     * Iterate over the properties for a type and set them as a completion item
     *
     * @private
     * @param {ts.Symbol[]} properties
     * @param {vscode.CompletionItem[]} items
     * @memberof AngularJSTemplateAutocomplete
     */
    private setCompletionProperties(properties: ts.Symbol[], items: vscode.CompletionItem[]): void {
        for (const property of properties) {
            const item: vscode.CompletionItem = new vscode.CompletionItem(property.escapedName.toString());
            item.documentation = this.fileParser.serializeSymbol(property);
            if (property.flags === ts.SymbolFlags.Method) {
                item.kind = vscode.CompletionItemKind.Method;
                item.insertText = `${property.escapedName}()`;
            }
            else {
                item.kind = vscode.CompletionItemKind.Property;
            }
            items.push(item);
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
        if (this.controllerNode && this.fileParser.checker) {
            const properties: ts.Symbol[] = this.getTypeProperties(this.controllerNode);
            this.setCompletionProperties(properties, items);
        }
    }

}
