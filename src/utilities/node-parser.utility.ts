import * as ts from 'typescript';
import * as path from 'path';
import { ControllerOptions } from '../models/controller-options.model';

export class NodeParser {
    constructor(public currentSourceFile: ts.SourceFile) {
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

        const template: ts.ClassElement | undefined = this.getTemplatePropertyFromClassElement(members, 'template');

        const templateUrl: ts.ClassElement | undefined = this.getTemplatePropertyFromClassElement(members, 'templateUrl');

        const controllerAs: ts.ClassElement | undefined = this.getControllerAsPropertyFromClassElement(members);

        if (this.hasControllerAndTemplateProperties(controller, template, templateUrl)) {
            if (this.templatePropertyHasTemplateName(template, templateName, controller)) {
                const controllerOptions: ControllerOptions = new ControllerOptions();
                controllerOptions.controller = (controller as any).initializer.escapedText;
                controllerOptions.controllerAs = controllerAs ? (controllerAs as any).initializer.text : '$ctrl';
                controllerOptions.template = (templateUrl as any).getFullText(this.currentSourceFile);
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

    private hasControllerAndTemplateProperties(controller: ts.ClassElement | undefined, template: ts.ClassElement | undefined, templateUrl: ts.ClassElement | undefined): boolean {
        if (controller && (template || templateUrl)) {
            return true;
        }
        return false;
    }

    private getTemplatePropertyFromClassElement(members: ts.NodeArray<ts.ClassElement>, escapedText: string): ts.ClassElement | undefined {
        return members.find((value: ts.ClassElement) => {
            if (value.name) {
                return (value.name as any).escapedText === escapedText;
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