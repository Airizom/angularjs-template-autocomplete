import * as vscode from 'vscode';

export class HtmlValidator {
    private beforeText: string;
    private lastLine: vscode.TextLine;
    private afterText: string;

    constructor(public document: vscode.TextDocument, public position: vscode.Position) {
        this.beforeText = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        this.lastLine = document.lineAt(document.lineCount - 1);
        this.afterText = document.getText(new vscode.Range(position, new vscode.Position(this.lastLine.lineNumber, this.lastLine.range.end.character)));
    }

    private getBeforeQuoteCharacter(characterToVerify: `"` | `'`): string {
        if (this.beforeText) {
            for (var i = this.beforeText.length - 1; i >= 0; i--) {
                const character: string = this.beforeText.charAt(i);
                if (character === characterToVerify) {
                    if (i !== 0) {
                        const previousCharacter: string = this.beforeText.charAt(i - 1);
                        if (previousCharacter === `=`) {
                            return character;
                        }
                        return '';
                    }
                }
            }
        }
        return '';
    }

    private isEnclosedInAttribute() {
        const beforeTextDoubleQuoteCharacter: string = this.getBeforeQuoteCharacter(`"`);
        const beforeTextSingleQuoteCharacter: string = this.getBeforeQuoteCharacter(`'`);

        if (beforeTextDoubleQuoteCharacter) {
            return this.hasCharacterInAfterText(beforeTextDoubleQuoteCharacter);
        }
        if (beforeTextSingleQuoteCharacter) {
            return this.hasCharacterInAfterText(beforeTextSingleQuoteCharacter);
        }

        return false;
    }

    private hasCharacterInAfterText(beforeTextCharacter: string): boolean {
        for (var i = 0 - 1; i < this.afterText.length; i++) {
            const character: string = this.afterText.charAt(i);
            if (character === beforeTextCharacter) {
                return true;
            }
        }
        return false;
    }

    private isEnclosedInDoubleBrackets(): boolean {
        if (this.beforeText) {
            let hasDoubleBracketInBeforeText: boolean = this.hasDoubleBracketInBeforeText();
            if (hasDoubleBracketInBeforeText) {
                return this.hasDoubleBracketInAfterText();
            }
        }

        return false;
    }

    private hasDoubleBracketInAfterText(): boolean {
        for (var i = 0 - 1; i < this.afterText.length; i++) {
            const character: string = this.afterText.charAt(i);
            if (character === '}') {
                if (i !== this.afterText.length) {
                    const previousCharacter: string = this.afterText.charAt(i + 1);
                    if (previousCharacter === '}') {
                        return true;
                    }
                    return false;
                }
            }
        }
        return false;
    }

    private hasDoubleBracketInBeforeText(): boolean {
        for (var i = this.beforeText.length - 1; i >= 0; i--) {
            const character: string = this.beforeText.charAt(i);
            if (character === '{') {
                if (i !== 0) {
                    const previousCharacter: string = this.beforeText.charAt(i - 1);
                    if (previousCharacter === '{') {
                        return true;
                    }
                    return false;
                }
            }
        }
        return false;
    }

    public isInsideInterpolation(): boolean {
        return this.isEnclosedInAttribute() || this.isEnclosedInDoubleBrackets();
    }

}