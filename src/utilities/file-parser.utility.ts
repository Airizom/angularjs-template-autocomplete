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
     * Config for the tyepscript program
     *
     * @static
     * @type {(ts.ParsedCommandLine | undefined)}
     * @memberof FileParser
     */
    public static parsedConfig: ts.ParsedCommandLine | undefined;


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
    public searchSourceFilesForController(templateFilePath: string): ControllerOptions | undefined {
        const controllerFilePath: string = this.getControllerFilePath(templateFilePath);

        if (controllerFilePath) {
            this.setParsedConfig();
            this.program = ts.createProgram([controllerFilePath], FileParser.parsedConfig ? FileParser.parsedConfig.options : {});
            this.checker = this.program.getTypeChecker();

            const sourceFiles: readonly ts.SourceFile[] = this.program.getSourceFiles();
            return this.getControllerOptionsInSourceFiles(sourceFiles, templateFilePath);
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
                this.checker.typeToString(this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration));
        }
        return '';
    }

    /**
     * Get the path of the controller if one exists
     *
     * @private
     * @param {string} templateFilePath
     * @returns {string}
     * @memberof FileParser
     */
    private getControllerFilePath(templateFilePath: string): string {
        let controllerOptions: ControllerOptions | undefined;
        for (const file of this.possibleControllerFileNames) {
            const node: ts.Node = this.getFirstChildNodeFromFileName(file);
            if (this.currentSourceFile) {
                this.nodeParser = new NodeParser(this.currentSourceFile);
                if (node) {
                    const nodeChildren: ts.Node[] = node.getChildren();
                    for (let j: number = 0; j < nodeChildren.length; j++) {
                        const nodeChild: ts.Node = nodeChildren[j];
                        if (this.nodeParser) {
                            controllerOptions = this.nodeParser.getTemplateControllerOptions(nodeChild, templateFilePath);
                            const templateName: string = path.basename(templateFilePath);
                            if (controllerOptions && controllerOptions.isValidController(templateName)) {
                                return file;
                            }
                        }
                    }
                }
            }
        }
        return '';
    }

    /**
     * Get first child node from a source file
     *
     * @private
     * @param {string} fileName
     * @returns {ts.Node}
     * @memberof FileParser
     */
    private getFirstChildNodeFromFileName(fileName: string): ts.Node {
        const baseName: string = path.basename(fileName);
        this.currentSourceFile = ts.createSourceFile(
            `${os.tmpdir()}${path.sep}${baseName}`,
            fs.readFileSync(`${this.currentFileDirectory}${path.sep}${baseName}`,
                { encoding: 'utf-8' }), ts.ScriptTarget.Latest
        );
        const children: ts.Node[] = this.currentSourceFile.getChildren();
        const node: ts.Node = children[0];
        return node;
    }

    /**
     * Search for controller node in all source files
     *
     * @private
     * @param {readonly} sourceFiles
     * @param {*} ts
     * @param {*} SourceFile
     * @param {*} []
     * @param {string} templateFilePath
     * @returns {(ControllerOptions | undefined)}
     * @memberof FileParser
     */
    private getControllerOptionsInSourceFiles(sourceFiles: readonly ts.SourceFile[], templateFilePath: string): ControllerOptions | undefined {
        for (const sourceFile of sourceFiles) {
            if (!sourceFile.isDeclarationFile) {
                const node: ts.Node = this.getFirstChildrenFromFile(sourceFile);
                if (node) {
                    const nodeChildren: ts.Node[] = node.getChildren();
                    for (const child of nodeChildren) {
                        if (this.nodeParser) {
                            const controllerOptions: ControllerOptions = this.nodeParser.getTemplateControllerOptions(child, templateFilePath);
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
     * Check if a config for the program already exists. If it doesn't find the tsconfig.json and create a config from it.
     * This config will be used to create a program for typescript.
     *
     * @private
     * @memberof FileParser
     */
    private setParsedConfig(): void {
        if (!FileParser.parsedConfig) {
            const tsConfigFilePath: string | undefined = this.findNearestTsconfigFilePath(this.currentFileDirectory);
            if (tsConfigFilePath) {
                const readConfig: {
                    config?: any;
                    error?: ts.Diagnostic | undefined;
                } = ts.readConfigFile(tsConfigFilePath, ts.sys.readFile.bind(this));
                FileParser.parsedConfig = ts.parseJsonConfigFileContent(readConfig.config, ts.sys, path.dirname(tsConfigFilePath));
            }
        }
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
            return `${this.currentFileDirectory}${path.sep}${value}`;
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
        const children: ts.Node[] = sourceFile.getChildren();
        const node: ts.Node = children[0];
        return node;
    }


}
