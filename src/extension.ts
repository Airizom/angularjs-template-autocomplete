import * as ts from 'typescript';
import * as vscode from 'vscode';
import { AngularJSTemplateAutocomplete } from './utilities/angularjs-template-autocomplete';
import { FileParser } from './utilities/file-parser.utility';

/**
 * this method is called when your extension is activated
 * your extension is activated the very first time the command is executed
 *
 * @export
 * @param {vscode.ExtensionContext} extensionContext
 * @returns
 */
export async function activate(extensionContext: vscode.ExtensionContext): Promise<void> {
    // Iterate over all workspace folders exclude node_modules
    const files: vscode.Uri[] = await vscode.workspace.findFiles('**/*.{ts,js}', '**/node_modules/**');

    // Convert to list of file paths
    const filePaths: string[] = files.map(file => file.fsPath);
    // Cache off the program
    FileParser.program = ts.createProgram(filePaths, FileParser.parsedConfig ? FileParser.parsedConfig.options : {});
    // When any files change, update the program
    vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'typescript' || event.document.languageId === 'javascript') {
            FileParser.program = ts.createProgram(filePaths, FileParser.parsedConfig ? FileParser.parsedConfig.options : {});
        }
    });
    const provider: vscode.Disposable = vscode.languages.registerCompletionItemProvider({ language: 'html', scheme: 'file' }, {
        provideCompletionItems(
            document: vscode.TextDocument,
            position: vscode.Position,
            token: vscode.CancellationToken,
            context: vscode.CompletionContext
        ): vscode.CompletionItem[] {
            const autoComplete: AngularJSTemplateAutocomplete = new AngularJSTemplateAutocomplete(document, position);
            const controllerCompletionItems: vscode.CompletionItem[] = [];

            autoComplete.setCompletionItems(controllerCompletionItems);

            return controllerCompletionItems;

        }
    }, '.');

    extensionContext.subscriptions.push(provider);
}

/**
 * this method is called when your extension is deactivated
 *
 * @export
 */
export function deactivate(): void {
    //
}
