# AngularJS Template Autocomplete for Visual Studio Code

This extension will allow the user to autocomplete AngularJS controller properties and methods inside an HTML template.

## Demo

![Autocomplete demo](demo.gif)

## Features

Autocomplete controller name inside of corresponding template file. If no controller name in the 'controllerAs' property. Then the controller name will default to '$ctrl'.<br/>
Autocomplete all controller properties and properties of properties inside the template.<br/>
Autocomplete will only work when using interpolation.

## Requirements

Project must use TypeScript.<br/>
HTML template, controller and options must be in the same directory.

## How it Works

When autocomplete is activated inside of an HTML file, then the extension will look for a corresponding controller options. If the controller options is found and the controller that is registered to the options is also found, then autocomplete suggestions will be provided in the template for that controller.

This extension will also only show autocomplete suggestions if it detects that the text that is being typed is inside AngularJS interpolation.
