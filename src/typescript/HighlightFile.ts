"use strict";

import * as fs from 'fs';
import * as Ajv from 'ajv';
import * as shiki from 'shiki';
import * as vsctm from 'vscode-textmate'
import { kotlinTmLanguage } from "./Scala.tmLanguage";

let schema = fs.readFileSync('./src/schemas/tmlanguage.json').toString();

var ajv = new Ajv({verbose: true});
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

var validate = ajv.compile(JSON.parse(schema));
var valid = validate(kotlinTmLanguage);
if (!valid) {
    console.error("The were validation errors.\n");
    console.error(validate.errors);
} else {
    const highlighter = shiki.getHighlighter({
        theme: 'nord',
        langs: [
            {
                id: 'kotlin',
                scopeName: 'source.kotlin',
                grammar: vsctm.parseRawGrammar(JSON.stringify(kotlinTmLanguage)) // find a way to do it better
            }
        ]
    })
    const code = fs.promises.readFile(process.argv[1], {encoding:'utf-8'})
    const both = Promise.all([highlighter, code])
    both.then([highlighter, code] => console.log(highlighter.codeToThemedTokens(code)))

}
