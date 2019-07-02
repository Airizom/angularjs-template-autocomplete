// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { AngularJSTemplateAutocomplete } from './utilities/angularjs-template-autocomplete';

/**
 * this method is called when your extension is activated
 * your extension is activated the very first time the command is executed
 *
 * @export
 * @param {vscode.ExtensionContext} context
 * @returns
 */
export function activate(context: vscode.ExtensionContext): void {

    const provider: vscode.Disposable = vscode.languages.registerCompletionItemProvider({ language: 'html', scheme: 'file' }, {

        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.CompletionItem[] {
            const autoComplete: AngularJSTemplateAutocomplete = new AngularJSTemplateAutocomplete(document, position);
            const controllerCompletionItems: vscode.CompletionItem[] = [];

            autoComplete.setCompletionItems(controllerCompletionItems);

            return controllerCompletionItems;

        }
    }, '.');

    context.subscriptions.push(provider);

}

// this method is called when your extension is deactivated
export function deactivate() { }
