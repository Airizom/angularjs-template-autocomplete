import * as ts from 'typescript';
import * as path from 'path';
import { ControllerOptions } from '../models/controller-options.model';

export class NodeParser {
    constructor() {
        //
    }

    public getTemplateControllerOptions(node: ts.Node, templateFilePath: string): ControllerOptions {
        if (node.kind === ts.SyntaxKind.VariableStatement) {
            //
        }
        if (node.kind === ts.SyntaxKind.ClassDeclaration) {
            const members = (node as ts.ClassDeclaration).members;
            const lastPathFragment: string = path.basename(templateFilePath);
            const controllerOptions = this.setControllerProperties(members, lastPathFragment);
            if (controllerOptions.areControllerPropertiesSet && controllerOptions.doesTemplateFileNameMatchTemplateProperty(lastPathFragment)) {
                return controllerOptions;
            }
        }
        return new ControllerOptions();
    }



    private setControllerProperties(members: ts.NodeArray<ts.ClassElement>, templateName: string): ControllerOptions {
        const controller: ts.ClassElement | undefined = this.getControllerPropertyFromClassElement(members);

        const template: ts.ClassElement | undefined = this.getTemplatePropertyFromClassElement(members);

        const templateUrl: ts.ClassElement | undefined = this.getTemplateUrlPropertyFromClassElement(members);

        const controllerAs: ts.ClassElement | undefined = this.getControllerAsPropertyFromClassElement(members);

        if (this.hasControllerAndTemplateProperties(controller, template, templateUrl)) {
            if (this.templatePropertyHasTemplateName(template, templateName, controller)) {
                const controllerOptions: ControllerOptions = new ControllerOptions();
                controllerOptions.controller = (controller as any).initializer.escapedText;
                controllerOptions.controllerAs = controllerAs ? (controllerAs as any).initializer.text : '$ctrl';
                controllerOptions.template = (templateUrl as any).initializer.text;
                return controllerOptions;
            } else if (this.templateUrlPropertyHasTemplateName(templateUrl, templateName, controller)) {
                const controllerOptions: ControllerOptions = new ControllerOptions();
                controllerOptions.controller = (controller as any).initializer.escapedText;
                controllerOptions.controllerAs = (controllerAs as any).initializer && (controllerAs as any).initializer.text ? (controllerAs as any).initializer.text : '$ctrl';
                controllerOptions.templateUrl = (templateUrl as any).initializer.text;
                return controllerOptions;
            }
        }
        return new ControllerOptions();
    }

    private templateUrlPropertyHasTemplateName(templateUrl: ts.ClassElement | undefined, templateName: string, controller: ts.ClassElement | undefined): boolean {
        if (templateUrl && (templateUrl as any).initializer && (templateUrl as any).initializer.text.includes(templateName)) {
            if (controller && controller.name) {
                if ((controller as any).initializer.escapedText) {
                    return true;
                }
            }
        }
        return false;
    }

    private templatePropertyHasTemplateName(template: ts.ClassElement | undefined, templateName: string, controller: ts.ClassElement | undefined): boolean {
        if (template && (template as any).initializer && (template as any).initializer.text.includes(templateName)) {
            if (controller && controller.name) {
                if ((controller as any).initializer.escapedText) {
                    return true;
                }
            }
        }
        return false;
    }

    private hasControllerAndTemplateProperties(controller: ts.ClassElement | undefined, template: ts.ClassElement | undefined, templateUrl: ts.ClassElement | undefined): boolean {
        if (controller && (template || templateUrl)) {
            return true;
        }
        return false;
    }

    private getTemplateUrlPropertyFromClassElement(members: ts.NodeArray<ts.ClassElement>): ts.ClassElement | undefined {
        return members.find((value: ts.ClassElement) => {
            if (value.name) {
                return (value.name as any).escapedText === 'templateUrl';
            }
        });
    }

    private getTemplatePropertyFromClassElement(members: ts.NodeArray<ts.ClassElement>): ts.ClassElement | undefined {
        return members.find((value: ts.ClassElement) => {
            if (value.name) {
                return (value.name as any).escapedText === 'template';
            }
        });
    }

    private getControllerPropertyFromClassElement(members: ts.NodeArray<ts.ClassElement>): ts.ClassElement | undefined {
        return members.find((value: ts.ClassElement) => {
            if (value.name) {
                return (value.name as any).escapedText === 'controller';
            }
        });
    }

    private getControllerAsPropertyFromClassElement(members: ts.NodeArray<ts.ClassElement>): ts.ClassElement | undefined {
        return members.find((value: ts.ClassElement) => {
            if (value.name) {
                return (value.name as any).escapedText === 'controllerAs';
            }
        });
    }

}