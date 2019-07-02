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
        if (node.kind === ts.SyntaxKind.VariableStatement) {
            //
        }
        if (node.kind === ts.SyntaxKind.ClassDeclaration) {
            const members: ts.NodeArray<ts.ClassElement> = (node as ts.ClassDeclaration).members;
            const lastPathFragment: string = path.basename(templateFilePath);
            const controllerOptions: ControllerOptions = this.setControllerProperties(members, lastPathFragment);
            if (controllerOptions.areControllerPropertiesSet && controllerOptions.doesTemplateFileNameMatchTemplateProperty(lastPathFragment)) {
                return controllerOptions;
            }
        }
        return new ControllerOptions();
    }

    /**
     * Set the correct controller options from an array of nodes
     *
     * @private
     * @param {ts.NodeArray<ts.ClassElement>} members
     * @param {string} templateName
     * @returns {ControllerOptions}
     * @memberof NodeParser
     */
    private setControllerProperties(members: ts.NodeArray<ts.ClassElement>, templateName: string): ControllerOptions {
        const controller: ts.ClassElement | undefined = this.getControllerPropertyFromClassElement(members);

        const template: ts.ClassElement | undefined = this.getTemplatePropertyFromClassElement(members, 'template');

        const templateUrl: ts.ClassElement | undefined = this.getTemplatePropertyFromClassElement(members, 'templateUrl');

        const controllerAs: ts.ClassElement | undefined = this.getControllerAsPropertyFromClassElement(members);

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
     * @param {(ts.ClassElement | undefined)} template
     * @param {string} templateName
     * @param {(ts.ClassElement | undefined)} controller
     * @returns {boolean}
     * @memberof NodeParser
     */
    private templatePropertyHasTemplateName(template: ts.ClassElement | undefined, templateName: string, controller: ts.ClassElement | undefined): boolean {
        if (template && (template as any).initializer) {
            const templateTextValue: string = (template as any).getFullText(this.currentSourceFile);
            if (controller && controller.name && templateTextValue.includes(templateName)) {
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
     * @param {(ts.ClassElement | undefined)} controller
     * @param {(ts.ClassElement | undefined)} template
     * @param {(ts.ClassElement | undefined)} templateUrl
     * @returns {boolean}
     * @memberof NodeParser
     */
    private hasControllerAndTemplateProperties(controller: ts.ClassElement | undefined, template: ts.ClassElement | undefined, templateUrl: ts.ClassElement | undefined): boolean {
        if (controller && (template || templateUrl)) {
            return true;
        }
        return false;
    }

    /**
     * Get the template name from the node array
     *
     * @private
     * @param {ts.NodeArray<ts.ClassElement>} members
     * @param {string} escapedText
     * @returns {(ts.ClassElement | undefined)}
     * @memberof NodeParser
     */
    private getTemplatePropertyFromClassElement(members: ts.NodeArray<ts.ClassElement>, escapedText: string): ts.ClassElement | undefined {
        return members.find((value: ts.ClassElement) => {
            if (value.name) {
                return (value.name as any).escapedText === escapedText;
            }
        });
    }

    /**
     * Get congroller property from class element node array
     *
     * @private
     * @param {ts.NodeArray<ts.ClassElement>} members
     * @returns {(ts.ClassElement | undefined)}
     * @memberof NodeParser
     */
    private getControllerPropertyFromClassElement(members: ts.NodeArray<ts.ClassElement>): ts.ClassElement | undefined {
        return members.find((value: ts.ClassElement) => {
            if (value.name) {
                return (value.name as any).escapedText === 'controller';
            }
        });
    }

    /**
     * Get the controllerAs property from class element node array
     *
     * @private
     * @param {ts.NodeArray<ts.ClassElement>} members
     * @returns {(ts.ClassElement | undefined)}
     * @memberof NodeParser
     */
    private getControllerAsPropertyFromClassElement(members: ts.NodeArray<ts.ClassElement>): ts.ClassElement | undefined {
        return members.find((value: ts.ClassElement) => {
            if (value.name) {
                return (value.name as any).escapedText === 'controllerAs';
            }
        });
    }

}