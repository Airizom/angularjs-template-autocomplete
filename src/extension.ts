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
			const autoComplete: AngularJSTemplateAutocomplete = new AngularJSTemplateAutocomplete(document, position);
			let controllerCompletionItem: vscode.CompletionItem[] = [];

			if (autoComplete.htmlValidator.isInsideInterpolation()) {

				let linePrefix = document.lineAt(position).text.substr(0, position.character);

				if (autoComplete.isAutocompleteAvailable) {
					controllerCompletionItem.push(new vscode.CompletionItem(autoComplete.controllerOptions.controllerAs));

					const controllerNode = autoComplete.controllerNode as Node;
					try {
						const program = ts.createProgram([autoComplete.fileParser.currentSourceFilePath], {});
						const checker = program.getTypeChecker();
						controllerNode.forEachChild((node: any) => {
							node.parent = controllerNode;
							if ((node as any).name && (node as any).name.escapedText) {
								if (ts.isPropertyDeclaration(node)) {
									const line = linePrefix.endsWith(`${autoComplete.controllerOptions.controllerAs}.`);
									if (line) {
										const item = new vscode.CompletionItem((node as any).name.escapedText);
										item.kind = vscode.CompletionItemKind.Property;
										controllerCompletionItem.push(item);
									}
								}
								if (ts.isMethodDeclaration(node)) {
									const line = linePrefix.endsWith(`${autoComplete.controllerOptions.controllerAs}.`);
									if (line) {
										const item = new vscode.CompletionItem((node as any).name.escapedText);
										item.kind = vscode.CompletionItemKind.Method;
										controllerCompletionItem.push(item);
									}
								}
								// if (ts.isPropertyDeclaration(node) || ts.isMethodDeclaration(node)) {
								// 	if (node && (node as any).type) {
								// 		(node as any).type.parent = controllerNode;
								// 		if (ts.isTypeNode((node as any).type)) {
								// 			try {
								// 				const type: ts.Type = checker.getTypeFromTypeNode((node as any).type);
								// 				const properties: ts.Symbol[] = type.getProperties();
								// 				for (const property of properties) {
								// 					const lineEnding = linePrefix.endsWith(`${autoComplete.controllerOptions.controllerAs}.${(node as any).name.escapedText}.`);
								// 					if (lineEnding) {
								// 						const item = new vscode.CompletionItem(property.escapedName.toString());
								// 						item.kind = vscode.CompletionItemKind.Property;
								// 						propertyCompletionItems.push(item);
								// 					}
								// 				}
								// 			} catch (error) {
								// 				// console.log(error);
								// 			}
								// 		}
								// 	}
								// }
							}
						});

					} catch (error) {
						console.log(error);
					}
				}

			}

			return controllerCompletionItem;

		}
	}, '.');

	context.subscriptions.push(provider1);

}

// this method is called when your extension is deactivated
export function deactivate() { }
