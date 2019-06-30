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