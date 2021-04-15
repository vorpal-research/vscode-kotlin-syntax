"use strict";

import * as glob from 'glob';
import * as fs from 'fs';
import * as Ajv from 'ajv';
import * as shiki from 'shiki';
import * as vsctm from 'vscode-textmate'
import { kotlinTmLanguage } from "./Scala.tmLanguage";
import {Highlighter} from "shiki";
import * as util from "util";

const aglob = util.promisify(glob) as typeof glob.__promisify__

async function highlight(file: string, outFile: string | null, highlighter: Highlighter): Promise<string> {
    console.log(`Highlighting: ${file}`)
    console.log(`Output: ${outFile}`)
    const code = await fs.promises.readFile(file, {encoding: 'utf-8'})
    const html = highlighter.codeToHtml(code, 'kotlin')
    const tokens = JSON.stringify(highlighter.codeToThemedTokens(code, 'kotlin'), null, 4)
    const result = html //+ "<pre>" + tokens + "</pre>"
    if (outFile != null) {
        await fs.promises.writeFile(outFile, result)
    } else {
        console.log(result)
    }
    return result
}

async function main() {
    let schema = await fs.promises.readFile('./src/schemas/tmlanguage.json', { encoding:'utf-8' });

    let ajv = new Ajv({verbose: true});
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

    var validate = ajv.compile(JSON.parse(schema));
    var valid = validate(kotlinTmLanguage);
    if (!valid) {
        console.error("The were validation errors.\n");
        console.error(validate.errors);
    }

    const grammar = vsctm.parseRawGrammar(JSON.stringify(kotlinTmLanguage), 'grammar.json')
    const highlighter = await shiki.getHighlighter({
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
    const stat = await fs.promises.lstat(file)
    if (stat.isDirectory()) {
        const files = await aglob(`${file}/**/*.kt`, {  })
        const res = await Promise.all(files.map(file => highlight(file, file + ".html", highlighter)))
        if (process.argv.length > 3) {
            await fs.promises.writeFile(process.argv[3], res.join("\n"))
        }
    } else {
        const outFile = (process.argv.length > 3) ? process.argv[3] : null
        await highlight(file, outFile, highlighter);
    }
}

main()
