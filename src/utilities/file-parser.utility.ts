import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import * as ts from 'typescript';
import * as os from 'os';
import { Node } from 'typescript';
import { NodeParser } from './node-parser.utility';

export class FileParser {

    private directoryFileNames: string[] = [];
    private possibleControllerFileNames: string[] = [];

    private nodeParser: NodeParser = new NodeParser();

    constructor(private document: vscode.TextDocument) {
        this.activate();
    }

    private activate(): void {
        const currentFileDirectory: string = path.dirname(this.document.fileName);

        this.directoryFileNames = fs.readdirSync(currentFileDirectory);
        this.possibleControllerFileNames = this.directoryFileNames.filter((value: string) => {
            return value.endsWith('.ts') || value.endsWith('.js');
        });

        this.searchNodeChildrenFromFiles(this.possibleControllerFileNames, currentFileDirectory, this.document.fileName);
    }

    private searchNodeChildrenFromFiles(files: string[], currentFileDirectory: string, templateFilePath: string): void {
        for (const fileName of files) {
            const sourceFile = ts.createSourceFile(`${os.tmpdir()}/${fileName}`, fs.readFileSync(`${currentFileDirectory}/${fileName}`, { encoding: 'utf-8' }), ts.ScriptTarget.Latest);
            const children = sourceFile.getChildren();
            const node = children[0];
            if (node) {
                const nodeChildren: Node[] = node.getChildren();
                for (const node of nodeChildren) {
                    this.nodeParser.parseNodeKind(node, templateFilePath);
                }
            }
        }
    }

}
