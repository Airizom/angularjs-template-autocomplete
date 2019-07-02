import * as vscode from 'vscode';

/**
 * Html validation of html template
 *
 * @export
 * @class HtmlValidator
 */
export class HtmlValidator {

    /**
     * Text in the html template that occurs before the users cursor
     *
     * @private
     * @type {string}
     * @memberof HtmlValidator
     */
    private beforeText: string;

    /**
     * Text in the html template that occurs after the users cursor
     *
     * @private
     * @type {string}
     * @memberof HtmlValidator
     */
    private afterText: string;

    /**
     * Last line of the html template
     *
     * @private
     * @type {vscode.TextLine}
     * @memberof HtmlValidator
     */
    private lastLine: vscode.TextLine;

    /**
     * The text that occurs at the beginning of a interpolation. Such a {{, =', or =""
     *
     * @private
     * @type {string}
     * @memberof HtmlValidator
     */
    private interpolationStartText: string = '';

    constructor(public document: vscode.TextDocument, public position: vscode.Position) {
        this.beforeText = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        this.lastLine = document.lineAt(document.lineCount - 1);
        this.afterText = document.getText(new vscode.Range(position, new vscode.Position(this.lastLine.lineNumber, this.lastLine.range.end.character)));
    }

    /**
     * Get the character that is used after an equals sign.
     *
     * @private
     * @param {(`"` | `'`)} characterToVerify
     * @returns {string}
     * @memberof HtmlValidator
     */
    private getBeforeQuoteCharacter(characterToVerify: `"` | `'`): string {
        if (this.beforeText) {
            for (let i: number = this.beforeText.length - 1; i >= 0; i--) {
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

    /**
     * Determine if user cursor is inside an html attribute.
     *
     * @private
     * @returns
     * @memberof HtmlValidator
     */
    private isEnclosedInAttribute(): boolean {
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

    /**
     * Determine if a character exists if text.
     *
     * @private
     * @param {string} beforeTextCharacter
     * @returns {boolean}
     * @memberof HtmlValidator
     */
    private hasCharacterInAfterText(beforeTextCharacter: string): boolean {
        for (let i: number = 0 - 1; i < this.afterText.length; i++) {
            const character: string = this.afterText.charAt(i);
            if (character === beforeTextCharacter) {
                this.interpolationStartText = `=${beforeTextCharacter}`;
                return true;
            }
        }
        return false;
    }

    /**
     * Determine if the text before and after user cursor is enclosed in double brackets.
     *
     * @private
     * @returns {boolean}
     * @memberof HtmlValidator
     */
    private isEnclosedInDoubleBrackets(): boolean {
        if (this.beforeText) {
            const hasDoubleBracketInBeforeText: boolean = this.hasDoubleBracketInBeforeText();
            if (hasDoubleBracketInBeforeText) {
                return this.hasDoubleBracketInAfterText();
            }
        }

        return false;
    }

    /**
     * Determine if a double bracket occurs in the text.
     *
     * @private
     * @returns {boolean}
     * @memberof HtmlValidator
     */
    private hasDoubleBracketInAfterText(): boolean {
        for (let i: number = 0 - 1; i < this.afterText.length; i++) {
            const character: string = this.afterText.charAt(i);
            if (character === '}') {
                if (i !== this.afterText.length) {
                    const previousCharacter: string = this.afterText.charAt(i + 1);
                    if (previousCharacter === '}') {
                        this.interpolationStartText = '{{';
                        return true;
                    }
                    return false;
                }
            }
        }
        return false;
    }

    /**
     * Determine a double brackets occurs in the text
     *
     * @private
     * @returns {boolean}
     * @memberof HtmlValidator
     */
    private hasDoubleBracketInBeforeText(): boolean {
        for (let i: number = this.beforeText.length - 1; i >= 0; i--) {
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

    /**
     * Determine if user is typing inside of a AngularJS interpolation string
     *
     * @returns {boolean}
     * @memberof HtmlValidator
     */
    public isInsideInterpolation(): boolean {
        return this.isEnclosedInAttribute() || this.isEnclosedInDoubleBrackets();
    }

    /**
     * Parse interpolation string so that we only get the statement that the user is typing.
     *
     * @returns {string}
     * @memberof HtmlValidator
     */
    public getInterpolationText(): string {
        const lastIndexOfStringInterpolationStartText: number = this.beforeText.lastIndexOf(this.interpolationStartText);
        const interpolationTextBeginning: string = this.beforeText.substring(lastIndexOfStringInterpolationStartText, this.beforeText.length);
        if (interpolationTextBeginning) {
            const interpolationValues: string[] = interpolationTextBeginning.substring(2).split(' ');
            const lastValue: string | undefined = interpolationValues.pop();
            if (lastValue) {
                return lastValue;
            }
        }
        return '';
    }

    /**
     * Remove the parenthesis and everything inside it from a method.
     *
     * @param {string} property
     * @returns {string}
     * @memberof HtmlValidator
     */
    public stripParenthesisFromProperty(property: string): string {
        if (property) {
            return property.replace(/\(.*\)/g, '');
        }
        return '';
    }

}