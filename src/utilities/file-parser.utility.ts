import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import * as ts from 'typescript';
import { NodeParser } from './node-parser.utility';
import { ControllerOptions } from '../models/controller-options.model';
import * as os from 'os';

/**
 * File Parser
 *
 * @export
 * @class FileParser
 */
export class FileParser {

    /**
     * File directory of the html template
     *
     * @type {string}
     * @memberof FileParser
     */
    public currentFileDirectory: string = path.dirname(this.document.fileName);

    /**
     * All possible files that could be used for controller
     *
     * @type {string[]}
     * @memberof FileParser
     */
    public possibleControllerFileNames: string[] = [];

    /**
     * Current file
     *
     * @type {(ts.SourceFile | undefined)}
     * @memberof FileParser
     */
    public currentSourceFile: ts.SourceFile | undefined;

    /**
     * Tyepscript program created so that we can parse all nodes for types
     *
     * @type {(ts.Program | undefined)}
     * @memberof FileParser
     */
    public program: ts.Program | undefined;

    /**
     * Checker used to check various types, properties and documentation
     *
     * @type {(ts.TypeChecker | undefined)}
     * @memberof FileParser
     */
    public checker: ts.TypeChecker | undefined;

    /**
     * Directoy files name that are present in the template directory
     *
     * @private
     * @type {string[]}
     * @memberof FileParser
     */
    private directoryFileNames: string[] = [];

    /**
     * Parser used to traverse typescript nodes
     *
     * @private
     * @type {(NodeParser | undefined)}
     * @memberof FileParser
     */
    private nodeParser: NodeParser | undefined;

    constructor(private readonly document: vscode.TextDocument) {
        this.activate();
    }

    /**
     * Search all nodes in the typescript tree for the controller options that match the html template name.
     *
     * @param {string} templateFilePath
     * @returns {(ControllerOptions | undefined)}
     * @memberof FileParser
     */
    public searchNodeChildrenFromFilesForControllerOptions(templateFilePath: string): ControllerOptions | undefined {
        const options: ts.CompilerOptions = {
            project: this.findNearestTsconfigFilePath(this.currentFileDirectory)
        };

        this.program = ts.createProgram(this.possibleControllerFileNames, options);
        this.checker = this.program.getTypeChecker();

        let controllerOptions: ControllerOptions | undefined;
        for (const sourceFile of this.program.getSourceFiles()) {
            if (!sourceFile.isDeclarationFile) {
                const node: ts.Node = this.getFirstChildrenFromFile(sourceFile);
                if (node) {
                    const nodeChildren: ts.Node[] = node.getChildren();
                    for (const child of nodeChildren) {
                        if (this.nodeParser) {
                            controllerOptions = this.nodeParser.getTemplateControllerOptions(child, templateFilePath);
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
     * Get the template controller node that matches that name found on the controller options.
     *
     * @param {string} controllerName
     * @returns {(ts.Node | undefined)}
     * @memberof FileParser
     */
    public getTemplateControllerNode(controllerName: string): ts.Node | undefined {
        if (this.program) {
            for (const sourceFile of this.program.getSourceFiles()) {
                const node: ts.Node = this.getFirstChildrenFromFile(sourceFile);
                if (node) {
                    const nodeChildren: ts.Node[] = node.getChildren(sourceFile);
                    for (const child of nodeChildren) {
                        if (child.kind === ts.SyntaxKind.ClassDeclaration) {
                            const classNode: ts.ClassDeclaration = (child as ts.ClassDeclaration);
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

    /**
     * Serialize a symbol to be used as documenation string.
     *
     * @param {ts.Symbol} symbol
     * @returns {string}
     * @memberof FileParser
     */
    public serializeSymbol(symbol: ts.Symbol): string {
        if (this.checker) {
            return symbol.getName() + os.EOL +
                ts.displayPartsToString(symbol.getDocumentationComment(this.checker)) + os.EOL +
                this.checker.typeToString(this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!));
        }
        return '';
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

    /**
     * Traverse the fie structure and find the project tsconfig if one exists.
     *
     * @private
     * @param {string} currentFileDirectory
     * @returns {string}
     * @memberof FileParser
     */
    private findNearestTsconfigFilePath(currentFileDirectory: string): string {
        const files: string[] = fs.readdirSync(currentFileDirectory);
        const tsConfigFile: string[] = files.filter((value: string) => {
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
        const children: ts.Node[] = sourceFile.getChildren();
        const node: ts.Node = children[0];
        return node;
    }


}
