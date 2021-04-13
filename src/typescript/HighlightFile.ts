"use strict";

import * as fs from 'fs';
import * as Ajv from 'ajv';
import * as shiki from 'shiki';
import * as vsctm from 'vscode-textmate'
import { kotlinTmLanguage } from "./Scala.tmLanguage";
import {Highlighter} from "shiki";

let schema = fs.readFileSync('./src/schemas/tmlanguage.json').toString();

var ajv = new Ajv({verbose: true});
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

var validate = ajv.compile(JSON.parse(schema));
var valid = validate(kotlinTmLanguage);
if (!valid) {
    console.error("The were validation errors.\n");
    console.error(validate.errors);
} else {
    const grammar = vsctm.parseRawGrammar(JSON.stringify(kotlinTmLanguage), 'grammar.json')
    const highlighter = shiki.getHighlighter({
        theme: 'github-dark',
        langs: [
            {
                id: 'kotlin',
                scopeName: 'source.kotlin',
                grammar: grammar// find a way to do it better
            }
        ]
    })
    const file = process.argv[2]
    const code = fs.promises.readFile(file, {encoding:'utf-8'})
    const both = Promise.all([highlighter, code]) as Promise<[Highlighter, string]>
    both.then(pair => {
        const [highlighter, code] = pair;
        console.log(highlighter.codeToHtml(code, 'kotlin'))
        console.log(JSON.stringify(highlighter.codeToThemedTokens(code, 'kotlin'), null, 4))
    })
}
