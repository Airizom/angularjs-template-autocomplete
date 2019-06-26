import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import * as ts from 'typescript';
import * as os from 'os';
import { Node } from 'typescript';
import { NodeParser } from './node-parser.utility';
import { ControllerOptions } from '../models/controller-options.model';

export class FileParser {

    public currentFileDirectory: string = path.dirname(this.document.fileName);
    public possibleControllerFileNames: string[] = [];
    public currentSourceFile: ts.SourceFile | undefined;

    private directoryFileNames: string[] = [];

    private nodeParser: NodeParser = new NodeParser();

    constructor(private document: vscode.TextDocument) {
        this.activate();
    }

    private activate(): void {
        this.directoryFileNames = fs.readdirSync(this.currentFileDirectory);
        this.possibleControllerFileNames = this.directoryFileNames.filter((value: string) => {
            return value.endsWith('.ts') || value.endsWith('.js');
        });

    }

    public searchNodeChildrenFromFiles(files: string[], currentFileDirectory: string, templateFilePath: string): ControllerOptions | undefined {
        let controllerOptions: ControllerOptions | undefined;
        for (let i: number = 0; i < files.length; i++) {
            const fileName = files[i];
            const node = this.getFirstChildrenFromFile(fileName, currentFileDirectory);
            if (node) {
                const nodeChildren: Node[] = node.getChildren();
                for (let j: number = 0; j < nodeChildren.length; j++) {
                    const node = nodeChildren[j];
                    controllerOptions = this.nodeParser.getTemplateControllerOptions(node, templateFilePath);
                    const templateName: string = path.basename(templateFilePath);
                    if (controllerOptions && controllerOptions.isValidController(templateName)) {
                        return controllerOptions;
                    }
                }
            }
        }
    }

    /**
     * Get the root level node from source file
     *
     * @private
     * @param {string} fileName
     * @param {string} currentFileDirectory
     * @returns
     * @memberof FileParser
     */
    private getFirstChildrenFromFile(fileName: string, currentFileDirectory: string): ts.Node {
        this.currentSourceFile = ts.createSourceFile(`${os.tmpdir()}/${fileName}`, fs.readFileSync(`${currentFileDirectory}/${fileName}`, { encoding: 'utf-8' }), ts.ScriptTarget.Latest);
        const children = this.currentSourceFile.getChildren();
        const node = children[0];
        return node;
    }

    public getTemplateControllerNode(controllerName: string): ts.Node | undefined {
        const currentFileDirectory: string = path.dirname(this.document.fileName);
        for (const fileName of this.possibleControllerFileNames) {
            const node = this.getFirstChildrenFromFile(fileName, currentFileDirectory);
            if (node) {
                const nodeChildren: Node[] = node.getChildren();
                for (const node of nodeChildren) {
                    if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                        const classNode = (node as ts.ClassDeclaration);
                        if (classNode.name && classNode.name.escapedText === controllerName) {
                            return classNode;
                        }
                    }
                }
            }
        }
        return undefined;
    }

}
