export class ControllerOptions {
    public controller: string = '';
    public template: string = '';
    public templateUrl: string = '';

    private _controllerAs: string = '';

    constructor() {
        //
    }

    /**
     * Return the controllerAs property set by the user. If one does not exist then use
     * default value of $ctrl.
     *
     * @readonly
     * @type {string}
     * @memberof ControllerOptions
     */
    public get controllerAs(): string {
        return this._controllerAs ? this.controllerAs : '$ctrl';
    }

    /**
     * Return true if the controller property has been set along with a template.
     *
     * @readonly
     * @type {boolean}
     * @memberof ControllerOptions
     */
    public get isValidController(): boolean {
        if (this.controller && (this.template || this.templateUrl)) {
            return true;
        }
        return false;
    }


}