import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import * as ts from 'typescript';
import { Node } from 'typescript';
import { NodeParser } from './node-parser.utility';
import { ControllerOptions } from '../models/controller-options.model';
import * as os from 'os';

export class FileParser {

    public currentFileDirectory: string = path.dirname(this.document.fileName);
    public possibleControllerFileNames: string[] = [];
    public currentSourceFile: ts.SourceFile | undefined;
    public currentSourceFilePath: string = '';
    public program: ts.Program | undefined;
    public checker: ts.TypeChecker | undefined;

    private directoryFileNames: string[] = [];

    private nodeParser: NodeParser | undefined;

    constructor(private document: vscode.TextDocument) {
        this.activate();
    }

    /**
     * Set up files to be used for the program
     *
     * @private
     * @memberof FileParser
     */
    private activate(): void {
        this.directoryFileNames = fs.readdirSync(this.currentFileDirectory);
        this.possibleControllerFileNames = this.directoryFileNames.filter((value: string) => {
            return value.endsWith('.ts') || value.endsWith('.js');
        });
        this.possibleControllerFileNames = this.possibleControllerFileNames.map((value: string) => {
            return `${this.currentFileDirectory}/${value}`;
        });
    }

    private findNearestTsconfigFilePath(currentFileDirectory: string): string {
        const files = fs.readdirSync(currentFileDirectory);
        const tsConfigFile = files.filter((value: string) => {
            return value.endsWith('tsconfig.json');
        });
        if (tsConfigFile.length) {
            return `${currentFileDirectory}${path.sep}${tsConfigFile[0]}`;
        }
        const splitPaths: string[] = path.dirname(currentFileDirectory).split(path.sep);
        currentFileDirectory = splitPaths.join(path.sep);
        if (currentFileDirectory) {
            return this.findNearestTsconfigFilePath(currentFileDirectory);
        }
        return '';
    }

    public searchNodeChildrenFromFilesForControllerOptions(templateFilePath: string): ControllerOptions | undefined {
        const options: ts.CompilerOptions = {
            project: this.findNearestTsconfigFilePath(this.currentFileDirectory)
        };

        this.program = ts.createProgram(this.possibleControllerFileNames, options);
        this.checker = this.program.getTypeChecker();

        let controllerOptions: ControllerOptions | undefined;
        for (const sourceFile of this.program.getSourceFiles()) {
            if (!sourceFile.isDeclarationFile) {
                const node = this.getFirstChildrenFromFile(sourceFile);
                if (node) {
                    const nodeChildren: Node[] = node.getChildren();
                    for (let j: number = 0; j < nodeChildren.length; j++) {
                        const node = nodeChildren[j];
                        if (this.nodeParser) {
                            controllerOptions = this.nodeParser.getTemplateControllerOptions(node, templateFilePath);
                            const templateName: string = path.basename(templateFilePath);
                            if (controllerOptions && controllerOptions.isValidController(templateName)) {
                                return controllerOptions;
                            }
                        }
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
    private getFirstChildrenFromFile(sourceFile: ts.SourceFile): ts.Node {
        this.nodeParser = new NodeParser(sourceFile);
        const children = sourceFile.getChildren();
        const node = children[0];
        return node;
    }

    public getTemplateControllerNode(controllerName: string): ts.Node | undefined {
        if (this.program) {
            for (const sourceFile of this.program.getSourceFiles()) {
                const node = this.getFirstChildrenFromFile(sourceFile);
                if (node) {
                    const nodeChildren: Node[] = node.getChildren(this.currentSourceFile);
                    for (const child of nodeChildren) {
                        if (child.kind === ts.SyntaxKind.ClassDeclaration) {
                            const classNode = (child as ts.ClassDeclaration);
                            if (classNode.name && classNode.name.escapedText === controllerName) {
                                return classNode;
                            }
                        }
                    }
                }
            }

        }
        return undefined;
    }

    public serializeSymbol(symbol: ts.Symbol): string {
        if (this.checker) {
            return symbol.getName() + os.EOL +
                ts.displayPartsToString(symbol.getDocumentationComment(this.checker)) + os.EOL +
                this.checker.typeToString(this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!));
        }
        return '';
    }


}
