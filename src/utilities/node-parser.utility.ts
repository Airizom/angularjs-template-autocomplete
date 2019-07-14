import * as ts from 'typescript';
import * as path from 'path';
import { ControllerOptions } from '../models/controller-options.model';

/**
 * Node parser used to find the controller node and controller options
 *
 * @export
 * @class NodeParser
 */
export class NodeParser {
    constructor(public currentSourceFile: ts.SourceFile) {
        //
    }

    /**
     * Get template controller options of a node if they exists, otherwise return an empty options object.
     *
     * @param {ts.Node} node
     * @param {string} templateFilePath
     * @returns {ControllerOptions}
     * @memberof NodeParser
     */
    public getTemplateControllerOptions(node: ts.Node, templateFilePath: string): ControllerOptions {
        const lastPathFragment: string = path.basename(templateFilePath);
        if (node.kind === ts.SyntaxKind.VariableStatement) {
            let declaration: ts.VariableDeclaration = (node as ts.VariableStatement).declarationList.declarations[0];
            if (declaration.initializer &&
                (declaration.initializer as any).body &&
                (declaration.initializer as any).body.kind === ts.SyntaxKind.Block &&
                (declaration.initializer as any).body.statements &&
                (declaration.initializer as any).body.statements[0] &&
                (declaration.initializer as any).body.statements[0].declarationList &&
                (declaration.initializer as any).body.statements[0].declarationList.declarations &&
                (declaration.initializer as any).body.statements[0].declarationList.declarations[0]
            ) {
                declaration = (declaration.initializer as any).body.statements[0].declarationList.declarations[0];
            }
            const controllerOptions: ControllerOptions = this.setControllerPropertiesFromVariable(declaration, lastPathFragment);
            if (controllerOptions.areControllerPropertiesSet && controllerOptions.doesTemplateFileNameMatchTemplateProperty(lastPathFragment)) {
                return controllerOptions;
            }
        }
        if (node.kind === ts.SyntaxKind.ClassDeclaration) {
            const members: ts.NodeArray<ts.NamedDeclaration> = (node as ts.ClassDeclaration).members;
            const controllerOptions: ControllerOptions = this.setControllerPropertiesFromClass(members, lastPathFragment);
            if (controllerOptions.areControllerPropertiesSet && controllerOptions.doesTemplateFileNameMatchTemplateProperty(lastPathFragment)) {
                return controllerOptions;
            }
        }
        return new ControllerOptions();
    }

    /**
     * Parse variable declaration and try and find controller options
     *
     * @private
     * @param {ts.VariableDeclaration} declaration
     * @returns {ControllerOptions}
     * @memberof NodeParser
     */
    private setControllerPropertiesFromVariable(declaration: ts.VariableDeclaration, templateName: string): ControllerOptions {
        if (declaration.initializer) {
            const properties: ts.NodeArray<ts.NamedDeclaration> = (declaration.initializer as ts.ObjectLiteralExpression).properties;
            if (properties) {
                const controller: ts.NamedDeclaration | undefined = this.getControllerPropertyFromProperties(properties);

                const template: ts.NamedDeclaration | undefined = this.getTemplatePropertyFromProperties(properties, 'template');

                const templateUrl: ts.NamedDeclaration | undefined = this.getTemplatePropertyFromProperties(properties, 'templateUrl');

                const controllerAs: ts.NamedDeclaration | undefined = this.getControllerAsPropertyFromProperties(properties);

                if (this.hasControllerAndTemplateProperties(controller, template, templateUrl)) {
                    if (this.templatePropertyHasTemplateName(template, templateName, controller)) {
                        const controllerOptions: ControllerOptions = new ControllerOptions();
                        controllerOptions.controller = (controller as any).initializer.escapedText;
                        controllerOptions.controllerAs = controllerAs ? (controllerAs as any).initializer.text : '$ctrl';
                        controllerOptions.template = (template as any).getFullText(this.currentSourceFile);
                        return controllerOptions;
                    } else if (this.templatePropertyHasTemplateName(templateUrl, templateName, controller)) {
                        const controllerOptions: ControllerOptions = new ControllerOptions();
                        controllerOptions.controller = this.getControllerName(controller);
                        controllerOptions.controllerAs = (controllerAs as any).initializer && (controllerAs as any).initializer.text ? (controllerAs as any).initializer.text : '$ctrl';
                        controllerOptions.templateUrl = (templateUrl as any).getFullText(this.currentSourceFile);
                        return controllerOptions;
                    }
                }
            }
        }
        return new ControllerOptions();
    }

    /**
     * Get the name of the controller if it is in an array or just declared as a variable
     *
     * @private
     * @param {(ts.NamedDeclaration | undefined)} controller
     * @returns {string}
     * @memberof NodeParser
     */
    private getControllerName(controller: ts.NamedDeclaration | undefined): string {
        if ((controller as any).initializer.kind === ts.SyntaxKind.ArrayLiteralExpression) {
            const arrayOfControllers: [] = (controller as any).initializer.elements;
            const lastController: any = arrayOfControllers[arrayOfControllers.length - 1];
            if (lastController.escapedText) {
                return lastController.escapedText;
            }
        }
        return (controller as any).initializer.escapedText;
    }

    /**
     * Get controllerAs property off of the properties array
     *
     * @private
     * @param {ts.NodeArray<ts.NamedDeclaration>} properties
     * @returns {(ts.NamedDeclaration | undefined)}
     * @memberof NodeParser
     */
    private getControllerAsPropertyFromProperties(properties: ts.NodeArray<ts.NamedDeclaration>): ts.NamedDeclaration | undefined {
        return properties.find((value: ts.NamedDeclaration) => {
            if ((value as any).name) {
                return (value as any).name.escapedText === 'controllerAs';
            }
        });
    }

    /**
     * Get property that is named template
     *
     * @private
     * @param {ts.NodeArray<ts.NamedDeclaration>} properties
     * @param {string} escapedText
     * @returns {(ts.NamedDeclaration | undefined)}
     * @memberof NodeParser
     */
    private getTemplatePropertyFromProperties(properties: ts.NodeArray<ts.NamedDeclaration>, escapedText: string): ts.NamedDeclaration | undefined {
        return properties.find((value: ts.NamedDeclaration) => {
            if (value.name) {
                return (value.name as any).escapedText === escapedText;
            }
        });
    }

    /**
     * Iterate over properties and find the node that has name of controller
     *
     * @private
     * @param {ts.NodeArray<ts.NamedDeclaration>} properties
     * @returns {(ts.NamedDeclaration | undefined)}
     * @memberof NodeParser
     */
    private getControllerPropertyFromProperties(properties: ts.NodeArray<ts.NamedDeclaration>): ts.NamedDeclaration | undefined {
        return properties.find((value: ts.NamedDeclaration) => {
            if ((value as any).name) {
                return (value as any).name.escapedText === 'controller';
            }
        });
    }

    /**
     * Set the correct controller options from an array of nodes
     *
     * @private
     * @param {ts.NodeArray<ts.NamedDeclaration>} members
     * @param {string} templateName
     * @returns {ControllerOptions}
     * @memberof NodeParser
     */
    private setControllerPropertiesFromClass(members: ts.NodeArray<ts.NamedDeclaration>, templateName: string): ControllerOptions {
        const controller: ts.NamedDeclaration | undefined = this.getControllerPropertyFromClassElement(members);

        const template: ts.NamedDeclaration | undefined = this.getTemplatePropertyFromClassElement(members, 'template');

        const templateUrl: ts.NamedDeclaration | undefined = this.getTemplatePropertyFromClassElement(members, 'templateUrl');

        const controllerAs: ts.NamedDeclaration | undefined = this.getControllerAsPropertyFromClassElement(members);

        if (this.hasControllerAndTemplateProperties(controller, template, templateUrl)) {
            if (this.templatePropertyHasTemplateName(template, templateName, controller)) {
                const controllerOptions: ControllerOptions = new ControllerOptions();
                controllerOptions.controller = (controller as any).initializer.escapedText;
                controllerOptions.controllerAs = controllerAs ? (controllerAs as any).initializer.text : '$ctrl';
                controllerOptions.template = (template as any).getFullText(this.currentSourceFile);
                return controllerOptions;
            } else if (this.templatePropertyHasTemplateName(templateUrl, templateName, controller)) {
                const controllerOptions: ControllerOptions = new ControllerOptions();
                controllerOptions.controller = (controller as any).initializer.escapedText;
                controllerOptions.controllerAs = (controllerAs as any).initializer && (controllerAs as any).initializer.text ? (controllerAs as any).initializer.text : '$ctrl';
                controllerOptions.templateUrl = (templateUrl as any).getFullText(this.currentSourceFile);
                return controllerOptions;
            }
        }
        return new ControllerOptions();
    }

    /**
     * Return if the element has a template name
     *
     * @private
     * @param {(ts.NamedDeclaration | undefined)} template
     * @param {string} templateName
     * @param {(ts.NamedDeclaration | undefined)} controller
     * @returns {boolean}
     * @memberof NodeParser
     */
    private templatePropertyHasTemplateName(template: ts.NamedDeclaration | undefined, templateName: string, controller: ts.NamedDeclaration | undefined): boolean {
        if (template && (template as any).initializer) {
            const templateTextValue: string = (template as any).getFullText(this.currentSourceFile);
            if (controller && controller.name && templateTextValue.includes(templateName)) {
                if ((controller as any).initializer.kind === ts.SyntaxKind.ArrayLiteralExpression) {
                    const arrayOfControllers: [] = (controller as any).initializer.elements;
                    const lastController: any = arrayOfControllers[arrayOfControllers.length - 1];
                    if ((lastController as any).escapedText) {
                        return true;
                    }
                }
                if ((controller as any).initializer.escapedText) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Return if the controller and template name exists
     *
     * @private
     * @param {(ts.NamedDeclaration | undefined)} controller
     * @param {(ts.NamedDeclaration | undefined)} template
     * @param {(ts.NamedDeclaration | undefined)} templateUrl
     * @returns {boolean}
     * @memberof NodeParser
     */
    private hasControllerAndTemplateProperties(
        controller: ts.NamedDeclaration | undefined,
        template: ts.NamedDeclaration | undefined,
        templateUrl: ts.NamedDeclaration | undefined
    ): boolean {
        if (controller && (template || templateUrl)) {
            return true;
        }
        return false;
    }

    /**
     * Get the template name from the node array
     *
     * @private
     * @param {ts.NodeArray<ts.NamedDeclaration>} members
     * @param {string} escapedText
     * @returns {(ts.NamedDeclaration | undefined)}
     * @memberof NodeParser
     */
    private getTemplatePropertyFromClassElement(members: ts.NodeArray<ts.NamedDeclaration>, escapedText: string): ts.NamedDeclaration | undefined {
        return members.find((value: ts.NamedDeclaration) => {
            if (value.name) {
                return (value.name as any).escapedText === escapedText;
            }
        });
    }

    /**
     * Get congroller property from class element node array
     *
     * @private
     * @param {ts.NodeArray<ts.NamedDeclaration>} members
     * @returns {(ts.NamedDeclaration | undefined)}
     * @memberof NodeParser
     */
    private getControllerPropertyFromClassElement(members: ts.NodeArray<ts.NamedDeclaration>): ts.NamedDeclaration | undefined {
        return members.find((value: ts.NamedDeclaration) => {
            if (value.name) {
                return (value.name as any).escapedText === 'controller';
            }
        });
    }

    /**
     * Get the controllerAs property from class element node array
     *
     * @private
     * @param {ts.NodeArray<ts.NamedDeclaration>} members
     * @returns {(ts.NamedDeclaration | undefined)}
     * @memberof NodeParser
     */
    private getControllerAsPropertyFromClassElement(members: ts.NodeArray<ts.NamedDeclaration>): ts.NamedDeclaration | undefined {
        return members.find((value: ts.NamedDeclaration) => {
            if (value.name) {
                return (value.name as any).escapedText === 'controllerAs';
            }
        });
    }

}
