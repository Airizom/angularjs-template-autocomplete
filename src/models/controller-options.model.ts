/**
 * Controller options used for controller node
 *
 * @export
 * @class ControllerOptions
 */
export class ControllerOptions {
    /**
     * Controller name
     *
     * @type {string}
     * @memberof ControllerOptions
     */
    public controller: string = '';
    /**
     * Template
     *
     * @type {string}
     * @memberof ControllerOptions
     */
    public template: string = '';
    /**
     * Template Url
     *
     * @type {string}
     * @memberof ControllerOptions
     */
    public templateUrl: string = '';
    /**
     * ControllerAs property
     *
     * @type {string}
     * @memberof ControllerOptions
     */
    public controllerAs: string = '$ctrl';

    /**
     * Return true if the controller property has been set along with a template.
     *
     * @readonly
     * @type {boolean}
     * @memberof ControllerOptions
     */
    public get areControllerPropertiesSet(): boolean {
        if (this.controller && (this.template || this.templateUrl)) {
            return true;
        }
        return false;
    }

    /**
     * Check to see if either template property contains the file name
     * in the text.
     *
     * @param {string} fileName The name of the file
     * @returns {boolean}
     * @memberof ControllerOptions
     */
    public doesTemplateFileNameMatchTemplateProperty(fileName: string): boolean {
        if (this.template && this.template.includes(fileName)) {
            return true;
        }

        if (this.templateUrl && this.templateUrl.includes(fileName)) {
            return true;
        }

        return false;
    }

    /**
     * Validate if the controller options are set and the template name matches the file name
     *
     * @param {string} fileName
     * @returns {boolean}
     * @memberof ControllerOptions
     */
    public isValidController(fileName: string): boolean {
        if (this.areControllerPropertiesSet && this.doesTemplateFileNameMatchTemplateProperty(fileName)) {
            return true;
        }
        return false;
    }
}
