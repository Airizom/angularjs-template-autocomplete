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
        this.controllerOptions = this.fileParser.searchNodeChildrenFromFiles(this.fileParser.possibleControllerFileNames, this.fileParser.currentFileDirectory, this.document.fileName) as ControllerOptions;
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
                const controllerNode = this.controllerNode as ts.Node;
                controllerNode.forEachChild((node: any) => {
                    node.parent = controllerNode;
                    if ((node as any).name && (node as any).name.escapedText) {
                        if (ts.isPropertyDeclaration(node)) {
                            const item = new vscode.CompletionItem((node as any).name.escapedText);
                            item.kind = vscode.CompletionItemKind.Property;
                            items.push(item);
                        }
                        if (ts.isMethodDeclaration(node)) {
                            const item = new vscode.CompletionItem((node as any).name.escapedText);
                            item.kind = vscode.CompletionItemKind.Method;
                            items.push(item);
                        }
                    }
                });

            }



        }

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