// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { AngularJSTemplateAutocomplete } from './utilities/angularjs-template-autocomplete';
import { Node } from 'typescript';
import * as ts from 'typescript';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let provider1 = vscode.languages.registerCompletionItemProvider({ language: 'html', scheme: 'file' }, {

		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
			const autoComplete: AngularJSTemplateAutocomplete = new AngularJSTemplateAutocomplete(document);

			let controllerCompletionItem: vscode.CompletionItem | undefined;
			let linePrefix = document.lineAt(position).text.substr(0, position.character);
			let propertyCompletionItems: vscode.CompletionItem[] = [];

			if (autoComplete.isAutocompleteAvailable) {

				const line = linePrefix.endsWith(`${autoComplete.controllerOptions.controllerAs}.`);
				if (line) {
					const controllerNode = autoComplete.controllerNode as Node;
					try {
						controllerNode.forEachChild((node: Node) => {
							if ((node as any).name && (node as any).name.escapedText) {
								if (ts.isPropertyDeclaration(node)) {
									const item = new vscode.CompletionItem((node as any).name.escapedText);
									item.kind = vscode.CompletionItemKind.Property;
									propertyCompletionItems.push(item);
								}
								if (ts.isMethodDeclaration(node)) {
									const item = new vscode.CompletionItem((node as any).name.escapedText);
									item.kind = vscode.CompletionItemKind.Method;
									propertyCompletionItems.push(item);
								}
							}
						});

					} catch (error) {
						console.log(error);
					}
				} else {
					controllerCompletionItem = new vscode.CompletionItem(autoComplete.controllerOptions.controllerAs);
				}
			}

			// return all completion items as array
			const completionItems = [];

			if (controllerCompletionItem) {
				completionItems.push(controllerCompletionItem);
			}

			if (propertyCompletionItems.length) {
				completionItems.push(...propertyCompletionItems);
			}

			return completionItems;
		}
	}, '.');

	context.subscriptions.push(provider1);

}

// this method is called when your extension is deactivated
export function deactivate() { }
