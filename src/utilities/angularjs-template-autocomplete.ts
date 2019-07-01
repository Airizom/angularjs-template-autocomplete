import { FileParser } from "./file-parser.utility";
import * as vscode from 'vscode';
import * as ts from 'typescript';
import { ControllerOptions } from "../models/controller-options.model";
import { HtmlValidator } from "./html-validator.utility";

export class AngularJSTemplateAutocomplete {
    public controllerNode: ts.Node | undefined;
    public controllerOptions: ControllerOptions = new ControllerOptions();

    public fileParser: FileParser = new FileParser(this.document);
    public htmlValidator: HtmlValidator = new HtmlValidator(this.document, this.position);

    constructor(private document: vscode.TextDocument, private position: vscode.Position) {
        this.activate();
    }

    private activate(): void {
        this.controllerOptions = this.fileParser.searchNodeChildrenFromFilesForControllerOptions(this.document.fileName) as ControllerOptions;
        if (this.controllerOptions) {
            this.controllerNode = this.fileParser.getTemplateControllerNode(this.controllerOptions.controller);
        }
    }

    public setCompletionItems(items: vscode.CompletionItem[]): void {
        if (this.htmlValidator.isInsideInterpolation() && this.isAutocompleteAvailable) {
            const interpolationText: string = this.htmlValidator.getInterpolationText();
            const interpolationProperties: string[] = interpolationText.split('.');
            if (interpolationProperties.length === 1) {
                items.push(new vscode.CompletionItem(this.controllerOptions.controllerAs));
            } else if (interpolationProperties.length === 2 && interpolationProperties[0] === this.controllerOptions.controllerAs) {
                if (this.controllerNode) {
                    this.controllerNode.forEachChild((node: ts.Node) => {
                        if ((node as any).name && (node as any).name.escapedText) {
                            if (ts.isPropertyDeclaration(node)) {
                                const item = new vscode.CompletionItem((node as any).name.escapedText);
                                item.kind = vscode.CompletionItemKind.Property;
                                items.push(item);
                            }
                            if (ts.isMethodDeclaration(node)) {
                                const item = new vscode.CompletionItem((node as any).name.escapedText);
                                item.kind = vscode.CompletionItemKind.Method;
                                item.documentation = this.getDocumentationFromNode(node);
                                items.push(item);
                            }
                        }
                    });
                }
            } else if (interpolationProperties.length === 3) {
                if (interpolationProperties[0] !== this.controllerOptions.controllerAs) {
                    return;
                }
                const controllerPropertyString = interpolationProperties[1];
                let secondNode: ts.Identifier | undefined;
                if (controllerPropertyString && this.controllerNode) {
                    this.controllerNode.forEachChild((node: ts.Node) => {
                        if ((node as any).name && (node as any).name.escapedText && controllerPropertyString === (node as any).name.escapedText) {
                            secondNode = node as ts.Identifier;
                        }
                    });
                }
                if (secondNode) {
                    if (ts.isPropertyDeclaration(secondNode) || ts.isMethodDeclaration(secondNode)) {
                        if (secondNode && secondNode.type) {
                            if (ts.isTypeNode(secondNode.type)) {
                                try {
                                    if (this.fileParser.checker) {
                                        const type: ts.Type = this.fileParser.checker.getTypeFromTypeNode(secondNode.type);
                                        const properties: ts.Symbol[] = this.fileParser.checker.getPropertiesOfType(type);
                                        for (const property of properties) {
                                            const item = new vscode.CompletionItem(property.escapedName.toString());
                                            if (property.flags === ts.SymbolFlags.Method) {
                                                item.kind = vscode.CompletionItemKind.Method;
                                                item.documentation = this.fileParser.serializeSymbol(property);
                                            } else {
                                                item.kind = vscode.CompletionItemKind.Property;
                                            }
                                            items.push(item);
                                        }
                                    }
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

    private getDocumentationFromNode(node: ts.MethodDeclaration): string {
        let docs = '';
        if (this.fileParser.checker) {
            const symbol = this.fileParser.checker.getSymbolAtLocation(node.name);
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