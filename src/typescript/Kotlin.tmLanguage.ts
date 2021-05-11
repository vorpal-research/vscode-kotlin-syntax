'use strict';
import {TmLanguage} from './TMLanguageModel';
import * as assert from 'assert';
import * as _ from 'lodash';

const upperLetterChars = 'A-Z\\p{Lt}\\p{Lu}'
const upperLetter = `[${upperLetterChars}]`
const lowerLetterChars = '_a-z\\$\\p{Lo}\\p{Nl}\\p{Ll}'
const lowerLetter = `[${lowerLetterChars}]`
const letterChars = `${upperLetterChars}${lowerLetterChars}`
const letter = `[${letterChars}]`
const letterOrDigitChars = `${letterChars}0-9`
const letterOrDigit = `[${letterOrDigitChars}]`
const alphaId = `${letter}+`
const letterOrDigitNoDollarSign = letterOrDigit.replace('\\$', '')
const simpleInterpolatedVariable = `${letter}${letterOrDigitNoDollarSign}*` // see SIP-11 https://docs.kotlin-lang.org/sips/string-interpolation.html
const opchar = `[!#%&*+\\-\\/:<>=?^|~\\p{Sm}\\p{So}]`
const idrest = `${letter}${letterOrDigit}*`
const idUpper = `${upperLetter}${letterOrDigit}*(?:(?<=_)${opchar}+)?`
const idLower = `${lowerLetter}${letterOrDigit}*(?:(?<=_)${opchar}+)?`
const plainid = `\\b(?:${idrest})\\b`
const backQuotedId = '`[^`]+`'
const anyId = `(?:${plainid}|${backQuotedId})`
const endOfLineMaybeWithComment = '(?=\\s*(//.*|/\\*(?!.*\\*/\\s*\\S.*).*)?$)'
const notStartOfComment = '(?!//|/\\*)'

const annotationTargets = '(file|field|property|get|set|param|setparam|delegate|receiver)'



// language=RegExp
export const kotlinTmLanguage: TmLanguage = {
    fileTypes: [
        'kotlin'
    ],
    firstLineMatch: '^#!/.*\\b\\w*kotlin\\b',
    foldingStartMarker: '/\\*\\*|\\{\\s*$',
    foldingStopMarker: '\\*\\*/|^\\s*\\}',
    keyEquivalent: '^~S',
    repository: {
        'empty-parentheses': {
            match: '(\\(\\))',
            captures: {
                '1': {name: 'meta.bracket.kotlin'}
            },
            name: 'meta.parentheses.kotlin'
        },
        imports: {
            end: '(?<=[\\n;])',
            begin: '\\b(import)\\s+',
            beginCaptures: {
                '1': {name: 'keyword.other.import.kotlin'}
            },
            patterns: [
                {include: '#comments'},
                {
                    match: idUpper,
                    name: 'entity.name.type.class.kotlin.import.kotlin'
                },
                {
                    match: `(${backQuotedId}|${plainid})`,
                    name: 'entity.name.import.kotlin'
                },
                {
                    match: `\\b(as)\\b`,
                    name: 'keyword.other.as.kotlin'
                },
                {
                    match: '\\.',
                    name: 'punctuation.definition.import'
                }
            ],
            name: 'meta.import.kotlin'
        },
        constants: {
            patterns: [
                {
                    match: '\\b(false|null|true)\\b',
                    name: 'constant.language.kotlin'
                },
                {
                    match: '\\b(0[xX][0-9a-fA-F][0-9a-fA-F_]*)[Uu]?[Ll]?\\b',
                    name: 'constant.numeric.kotlin'
                },
                {
                    match: '\\b(0[bB][01][01_]*)[Uu]?[Ll]?\\b',
                    name: 'constant.numeric.kotlin'
                },
                {
                    match: '\\b(([0-9][0-9_]*[Uu]?[Ll]?(\\.[0-9][0-9_]*)?)([eE](\\+|-)?[0-9][0-9_]*)?|[0-9][0-9_]*)[Ff]?\\b',
                    name: 'constant.numeric.kotlin'
                },
                {
                    match: '\\b(this|super)\\b(?!@)',
                    name: 'variable.language.kotlin'
                },
                {
                    match: `\\b(this|super)@(${backQuotedId}|${plainid})\\b`,
                    name: 'variable.language.kotlin'
                }
            ]
        },
        'script-header': {
            match: '^#!(.*)$',
            captures: {
                '1': {name: 'string.unquoted.shebang.kotlin'}
            },
            name: 'comment.block.shebang.kotlin'
        },
        code: {
            patterns: [
                {include: '#script-header'},
                {include: '#storage-modifiers'},
                {include: '#declarations'},
                {include: '#imports'},
                {include: '#comments'},
                {include: '#strings'},
                {include: '#keywords'},
                {include: '#constants'},
                {include: '#inline'},
                {include: '#vararg'},
                {include: '#char-literal'},
                {include: '#empty-parentheses'},
                {include: '#qualifiedClassName'},
                {include: '#parameter-list'},
                {include: '#backQuotedVariable'},
                {include: '#curly-braces'},
                {include: '#meta-brackets'},
                {include: '#meta-colons'},
                {include: '#annotations'},
                {include: '#labels'},
                {include: '#angle-brackets'},
                {include: '#generics'},
                {include: '#init-block'}
            ]
        },
        strings: {

            patterns: [
                {
                    end: '"""(?!")',
                    begin: '"""',
                    beginCaptures: {
                        '0': {name: 'punctuation.definition.string.begin.kotlin'}
                    },
                    patterns: [
                        {
                            include: '#string-interpolation'
                        }
                    ],
                    endCaptures: {
                        '0': {name: 'punctuation.definition.string.end.kotlin'}
                    },
                    name: 'string.quoted.triple.kotlin'
                },
                {
                    end: '"',
                    begin: '"',
                    beginCaptures: {
                        '0': {name: 'punctuation.definition.string.begin.kotlin'}
                    },
                    patterns: [
                        {
                            match: `\\\\(?:[btnfr$\\\\"']|u[0-9A-Fa-f]{4})`,
                            name: 'constant.character.escape.kotlin'
                        },
                        {
                            match: '\\\\.',
                            name: 'invalid.illegal.unrecognized-string-escape.kotlin'
                        },
                        {
                            include: '#string-interpolation'
                        }
                    ],
                    endCaptures: {
                        '0': {name: 'punctuation.definition.string.end.kotlin'}
                    },
                    name: 'string.quoted.double.kotlin'
                }
            ]
        },
        'string-interpolation': {
            patterns: [
                {
                    name: 'meta.template.expression.kotlin',
                    match: `(\\$)(${simpleInterpolatedVariable})`,
                    contentName: 'string.interpolated.kotlin'
                },
                {
                    name: 'meta.template.expression.kotlin',
                    begin: '\\$\\{',
                    beginCaptures: {'0': {name: 'punctuation.definition.template-expression.begin.kotlin'}},
                    end: '\\}',
                    endCaptures: {'0': {name: 'punctuation.definition.template-expression.end.kotlin'}},
                    patterns: [{include: '#code'}],
                    contentName: 'meta.embedded.line.kotlin'
                }
            ]
        },
        'meta-colons': {
            patterns: [
                {
                    match: '(?<!:):(?!:)',
                    name: 'meta.colon.kotlin'
                }
            ],
            comment: 'For themes: Matching type colons'
        },
        keywords: {
            patterns: [
                {
                    match: '\\b(return|throw|break|continue)\\b(?!@)',
                    name: 'keyword.control.flow.jump.kotlin'
                },
                {
                    match: `\\b(break|continue|return)@(${idrest}|${backQuotedId})\\b`,
                    name: 'keyword.control.flow.jump.kotlin'
                },
                {
                    match: '\\b(as\\?)',
                    name: 'support.function.type-of.kotlin'
                },
                {
                    match: '\\b(as|is)\\b',
                    name: 'support.function.type-of.kotlin'
                },
                {
                    match: `\\b(in)\\b`,
                    name: 'keyword.operator.contains.kotlin'
                },
                {
                    match: `\\b(by)\\b`,
                    name: 'keyword.operator.delegation.kotlin'
                },
                {
                    match: '\\b(else|if|do|while|for|when)\\b',
                    name: 'keyword.control.flow.kotlin'
                },
                {
                    match: '\\b(catch|finally|try)\\b',
                    name: 'keyword.control.exception.kotlin'
                },
                {
                    match: '(?<=::)\\s*(class)\\b',
                    captures: {
                        '1': {name: 'keyword.operator.class-literal.kotlin'}
                    }
                },
                {
                    match: '(===?|!==?|<=|>=|<|>)',
                    name: 'keyword.operator.comparison.kotlin'
                },
                {
                    match: '((?<![!=<>])=(?!=))',
                    name: 'keyword.operator.assignment.kotlin'
                },
                {
                    match: '([+-/*%]=(?!=))',
                    name: 'keyword.operator.assignment.kotlin'
                },
                {
                    match: '(\\-(?!>)|\\+|\\*|/(?![/*])|%)',
                    name: 'keyword.operator.arithmetic.kotlin'
                },
                {
                    match: `(!(?![=!])|&&|\\|\\|)`,
                    name: 'keyword.operator.logical.kotlin'
                },
                {
                    match: `(!!)+`,
                    name: 'keyword.operator.bangbang.kotlin'
                },
                {
                    match: `(\\?)+(?![.:])`,
                    name: 'keyword.operator.quest.kotlin'
                },
                {
                    match: `(\\?:(?!:))`,
                    name: 'keyword.operator.elvis.kotlin'
                },
                {
                    match: `(::)`,
                    name: 'punctuation.separator.coloncolon.kotlin'
                },
                {
                    match: `(->)`,
                    name: 'keyword.operator.arrow.kotlin'
                },
            ]
        },
        inline: {
            patterns: [
                { // inline parameters
                    match: `\\b(noinline|crossinline)(?=\\s+(${plainid}|${backQuotedId})\\s*:)`,
                    name: 'storage.modifier.other'
                },
            ]
        },
        vararg: {
            patterns: [
                { // inline parameters
                    match: `\\b(vararg)(?=\\s+(${plainid}|${backQuotedId})\\s*:)`,
                    name: 'storage.modifier.other'
                },
                {
                    match: `\\b(vararg)(?=\\s+val)`,
                    name: 'storage.modifier.other'
                },
                {
                    match: `\\b(vararg)(?=\\s+var)`,
                    name: 'storage.modifier.other'
                },
            ]
        },
        declarations: {
            patterns: [
                {
                    end: '(?=[={;])',
                    begin: '\\b(fun)\\b',
                    beginCaptures: {
                        '1': {name: 'keyword.declaration.kotlin'},
                    },
                    patterns: [
                        {include: '#code'},
                        {
                            match: `\\b(${anyId})\\s*\\.`,
                            captures: {
                                '1': {name: 'entity.name.type.class.kotlin'}
                            }
                        },
                        {
                            match: `\\b(${anyId})(?!\\s*\\.)`,
                            captures: {
                                '1': {name: 'entity.name.function.declaration'}
                            }
                        },
                    ]
                },
                { // non-generic interface
                    match: `\\b(?:(fun)\\s+)?(interface)\\b\\s*(${anyId})\\s*(?!\\<)`,
                    captures: {
                        '1': {name: 'keyword.declaration.kotlin'},
                        '2': {name: 'keyword.declaration.kotlin'},
                        '3': {name: 'entity.name.type.class.kotlin.declaration'}
                    }
                },
                { // non-generic class
                    match: `\\b(?:(data|enum|annotation|inline|value)\\s+)?(class)\\b\\s*(${anyId})\\s*(?!\\<)`,
                    captures: {
                        '1': {name: 'keyword.declaration.kotlin'},
                        '2': {name: 'keyword.declaration.kotlin'},
                        '3': {name: 'entity.name.type.class.kotlin.declaration'}
                    }
                },
                {
                    begin: `\\b(?:(fun)\\s+)?(interface)\\s+(${anyId})\\s*(\\<)`,
                    end: '(?<!-)\\>',
                    beginCaptures: {
                        '1': {name: 'keyword.declaration.kotlin'},
                        '2': {name: 'keyword.declaration.kotlin'},
                        '3': {name: 'entity.name.type.class.kotlin.declaration'},
                        '4': {name: 'punctuation.bracket.angle.kotlin'}
                    },
                    endCaptures: {
                        '0': {name: 'punctuation.bracket.angle.kotlin'}
                    },
                    patterns: [{include: '#type-only-context'}]
                },
                {
                    begin: `\\b(?:(data|enum|annotation|inline|value)\\s+)?(class)\\s+(${anyId})\\s*(\\<)`,
                    end: '(?<!-)\\>',
                    captures: {
                        '1': {name: 'keyword.declaration.kotlin'},
                        '2': {name: 'keyword.declaration.kotlin'},
                        '3': {name: 'entity.name.type.class.kotlin.declaration'},
                        '4': {name: 'punctuation.bracket.angle.kotlin'},
                    },
                    endCaptures: {
                        '0': {name: 'punctuation.bracket.angle.kotlin'}
                    },
                    patterns: [{include: '#type-only-context'},]
                },
                { // non-generic class
                    match: `\\b(typealias)\\b\\s*(${anyId})\\s*(?!\\<)`,
                    captures: {
                        '1': {name: 'keyword.declaration.kotlin'},
                        '2': {name: 'entity.name.type.kotlin.declaration'},
                    }
                },
                {
                    begin: `\\b(typealias)\\b\\s*(${anyId})\\s*(\\<)`,
                    end: '(?<!-)\\>',
                    beginCaptures: {
                        '1': {name: 'keyword.declaration.kotlin'},
                        '2': {name: 'entity.name.type.class.kotlin.declaration'},
                        '3': {name: 'punctuation.bracket.angle.kotlin'},
                    },
                    endCaptures: {
                        '0': {name: 'punctuation.bracket.angle.kotlin'}
                    },
                    patterns: [{include: '#type-only-context'}]
                },
                {
                    match: `\\b(?:(companion)\\s+)?(object)\\b\\s*(${anyId})?`,
                    captures: {
                        '1': {name: 'keyword.declaration.kotlin'},
                        '2': {name: 'keyword.declaration.kotlin'},
                        '3': {name: 'entity.name.type.class.kotlin.declaration'}
                    }
                },

                {
                    begin: `\\b(?:(val)|(var))\\b(?=\\s*[(])`,
                    end: '(?<=\\))',
                    beginCaptures: {
                        '1': {name: 'keyword.declaration.stable.kotlin'},
                        '2': {name: 'keyword.declaration.volatile.kotlin'}
                    },
                    patterns: [
                        {
                            match: `${anyId}`,
                            name: 'variable.other.definition.kotlin'
                        },
                        {
                            match: ',',
                            name: 'punctuation.comma.kotlin'
                        }
                    ]
                },
                {
                    match: `\\b(?:(val)|(var))\\b\\s*(${anyId})`,
                    captures: {
                        '1': {name: 'keyword.declaration.stable.kotlin'},
                        '2': {name: 'keyword.declaration.volatile.kotlin'},
                        '3': {name: 'variable.other.definition.kotlin'}
                    }
                },
                {
                    match: `\\b(?:(val)|(var))\\b(?!\\s*(${anyId}|([(])))`,
                    captures: {
                        '1': {name: 'keyword.declaration.stable.kotlin'},
                        '2': {name: 'keyword.declaration.volatile.kotlin'}
                    }
                },
                {
                    end: '(?<=[\\n;])',
                    begin: '\\b(package)\\s+',
                    beginCaptures: {
                        '1': {name: 'keyword.other.import.kotlin'}
                    },
                    patterns: [
                        {include: '#comments'},
                        {
                            match: `(${backQuotedId}|${plainid})`,
                            name: 'entity.name.package.kotlin'
                        },
                        {
                            match: '\\.',
                            name: 'punctuation.definition.package'
                        }
                    ],
                    name: 'meta.package.kotlin'
                }
            ]
        },
        'char-literal': {
            end: "'|$",
            begin: "'",
            beginCaptures: {
                '0': {name: 'punctuation.definition.character.begin.kotlin'}
            },
            patterns: [
                {
                    match: `\\\\(?:[btnfr\\\\"']|[0-7]{1,3}|u[0-9A-Fa-f]{4})`,
                    name: 'constant.character.escape.kotlin'
                },
                {
                    match: '\\\\.',
                    name: 'invalid.illegal.unrecognized-character-escape.kotlin'
                },
                {
                    match: '[^\']{2,}',
                    name: 'invalid.illegal.character-literal-too-long'
                },
                {
                    match: '(?<!\')[^\']',
                    name: 'invalid.illegal.character-literal-too-long'
                }
            ],
            endCaptures: {
                '0': {name: 'punctuation.definition.character.end.kotlin'}
            },
            name: 'string.quoted.other constant.character.literal.kotlin'
        },
        'curly-braces': {
            begin: '\\{',
            end: '\\}',
            beginCaptures: {
                '0': {name: 'punctuation.section.block.begin.kotlin'}
            },
            endCaptures: {
                '0': {name: 'punctuation.section.block.end.kotlin'}
            },
            patterns: [{include: '#code'}]
        },
        'angle-brackets': {
            begin: '(?<=\\<)',
            end: '(?=\\>)',
            patterns: [
                {
                    match: '\\b(out|in|reified)\\b',
                    name: 'storage.modifier.other'
                },
                {include: '#code'},
            ]
        },
        'type-only-context': {
            patterns: [
                {
                    match: '\\b(out|in|reified|suspend)\\b',
                    name: 'storage.modifier.other'
                },
                {
                    match: ',',
                    name: 'punctuation.comma.kotlin'
                },
                {
                    match: '->',
                    name: 'keyword.operator.arrow.kotlin'
                },
                {
                    match: '\\*',
                    name: 'keyword.operator.star.kotlin'
                },
                {
                    match: `(${anyId}\s*\\?*)`,
                    captures: {
                        '1': {name: 'entity.name.type.class.kotlin'}
                    }
                },
                {
                    begin: '\\<',
                    end: '(?<!-)\\>',
                    beginCaptures: {
                        '0': {
                            name: 'punctuation.bracket.angle.open.kotlin'
                        }
                    },
                    endCaptures: {
                        '0': {
                            name: 'punctuation.bracket.angle.close.kotlin'
                        }
                    },
                    patterns: [{include: '#type-only-context'}]
                },
                {
                    begin: '\\(',
                    end: '\\)',
                    beginCaptures: {
                        '0': {
                            name: 'punctuation.paren.open.kotlin'
                        }
                    },
                    endCaptures: {
                        '0': {
                            name: 'punctuation.paren.close.kotlin'
                        }
                    },
                    patterns: [{include: '#type-only-context'}]
                },
                {include: '#parameter-list'},
                {include: '#annotations'},
            ]
        },
        generics: {
            begin: `(?<=\\b(var|val|fun)\\b)\\s*(\\<)`,
            end: '(?<!-)\\>',
            beginCaptures: {
                '0': {name: 'punctuation.bracket.angle.kotlin'}
            },
            endCaptures: {
                '0': {name: 'punctuation.bracket.angle.kotlin'}
            },
            patterns: [{include: '#type-only-context'},]
        },
        'meta-brackets': {
            patterns: [
                {
                    match: '\\{',
                    comment: 'The punctuation.section.*.begin is needed for return snippet in source bundle',
                    name: 'punctuation.section.block.begin.kotlin'
                },
                {
                    match: '\\}',
                    comment: 'The punctuation.section.*.end is needed for return snippet in source bundle',
                    name: 'punctuation.section.block.end.kotlin'
                },
                {
                    match: '\\{|\\}|\\(|\\)|\\[|\\]',
                    name: 'meta.bracket.kotlin'
                }
            ],
            comment: 'For themes: Brackets look nice when colored.'
        },
        qualifiedClassName: {
            match: '((?<!@)\\b([A-Z][\\w]*)\\b(?!@))',
            captures: {
                '2': {
                    name: 'entity.name.type.class.kotlin'
                }
            }
        },
        backQuotedVariable: {
            // capture back quoted variables in code so special symbols inside them do not
            // interfere with the rest of the rules. But don't assign any extra scope, to make them
            // consistent with the rest of variables
            match: `${backQuotedId}`
        },
        'storage-modifiers': {
            patterns: [
                {
                    match: '\\b(public|private|protected|internal)\\b',
                    name: 'storage.modifier.access'
                },
                {
                    match: '\\b(abstract|open|final|sealed|override|inner)\\b',
                    name: 'storage.modifier.other'
                },
                {
                    match: '(?<=^|\\s)\\b(tailrec|infix|inline|open|operator|const|external|expect|actual|lateinit|suspend)\\b' +
                        '(?=[a-z\\s]*\\b(fun|val|var|get|set|class|interface|object)\\b)',
                    name: 'storage.modifier.other'
                }
            ]
        },
        comments: {
            patterns: [
                {include: '#block-comments'},
                {
                    end: '(?!\\G)',
                    begin: '(^[ \\t]+)?(?=//)',
                    beginCaptures: {
                        '1': {name: 'punctuation.whitespace.comment.leading.kotlin'}
                    },
                    patterns: [
                        {
                            end: '\\n',
                            begin: '//',
                            beginCaptures: {
                                '0': {name: 'punctuation.definition.comment.kotlin'}
                            },
                            name: 'comment.line.double-slash.kotlin'
                        }
                    ]
                }
            ]
        },
        'block-comments': {
            patterns: [
                {
                    match: '/\\*\\*/',
                    captures: {
                        '0': {name: 'punctuation.definition.comment.kotlin'}
                    },
                    name: 'comment.block.empty.kotlin'
                },
                {
                    end: '\\*/',
                    begin: '^\\s*(/\\*\\*)(?!/)',
                    beginCaptures: {
                        '1': {name: 'punctuation.definition.comment.kotlin'}
                    },
                    contentName: 'meta.embedded.kdoc.markdown',
                    patterns: [
                        {
                            match: '^\\s*\\*(?!/)',
                            name: 'punctuation.definition.comment.kotlin'
                        },
                        {
                            match: '(@(?:param|property|throws|exception|sample))\\s+(\\S+)',
                            captures: {
                                '1': {name: 'keyword.other.documentation.kotlindoc.kotlin'},
                                '2': {name: 'variable.parameter.kotlin'}
                            }
                        },
                        {
                            match: '@(return|constructor|receiver|author|since|suppress)\\b',
                            name: 'keyword.other.documentation.kotlindoc.kotlin'
                        },
                        {
                            match: '(\\[)([^\\]]+)(\\])',
                            captures: {
                                '1': {name: 'punctuation.definition.documentation.link.kotlin'},
                                '2': {name: 'string.other.link.title.markdown'},
                                '3': {name: 'punctuation.definition.documentation.link.kotlin'}
                            }
                        },
                        {include: '#block-comments'}
                    ],
                    endCaptures: {
                        '0': {name: 'punctuation.definition.comment.kotlin'}
                    },
                    name: 'comment.block.documentation.kotlin'
                },
                {
                    end: '\\*/',
                    begin: '/\\*',
                    captures: {
                        '0': {name: 'punctuation.definition.comment.kotlin'}
                    },
                    patterns: [{include: '#block-comments'}],
                    name: 'comment.block.kotlin'
                },
            ]
        },
        'init-block': {
            patterns: [
                {
                    match: `\\b(init)\\s*(?=\\{)`,
                    captures: {
                        '1': {name: 'keyword.control.flow.kotlin'}
                    }
                }
            ]
        },
        labels: {
            patterns: [
                {
                    match: `\\b(${anyId})@`,
                    name: 'meta.label.kotlin'
                }
            ]
        },
        annotations: {
            patterns: [
                {
                    match: `@${anyId}\\s*(?![.:])`,
                    name: 'storage.type.annotation.kotlin'
                },
                {
                    match: `@(${annotationTargets})\\s*:\\s*(${anyId})\\s*(?!\\.)`,
                    name: 'storage.type.annotation.kotlin'
                },
                {
                    begin: `@${anyId}\\s*\\.`,
                    end: `${anyId}\\s*(?!\\.)`,
                    name: 'storage.type.annotation.kotlin'
                },
                {
                    begin: `@\\[`,
                    end: '\\]',
                    beginCaptures: {
                        '0': {name: 'storage.type.annotation.kotlin'}
                    },
                    endCaptures: {
                        '0': {name: 'storage.type.annotation.kotlin'}
                    },
                    patterns: [
                        {
                            match: `(${anyId})`,
                            name: 'storage.type.annotation.kotlin'
                        },
                        {include: '#code'}
                    ]
                },
                {
                    begin: `@(${annotationTargets})\\s*:\\s*\\[`,
                    end: '\\]',
                    beginCaptures: {
                        '0': {name: 'storage.type.annotation.kotlin'}
                    },
                    endCaptures: {
                        '0': {name: 'storage.type.annotation.kotlin'}
                    },
                    patterns: [
                        {
                            match: `(${anyId})`,
                            name: 'storage.type.annotation.kotlin'
                        },
                        {include: '#code'}
                    ]
                },
            ]
        },
        'parameter-list': {
            patterns: [
                {
                    match: `(?<=[^\\._$a-zA-Z0-9])(${backQuotedId}|${idLower})\\s*(:)(?!:)`,
                    captures: {
                        '1': {name: 'variable.parameter.kotlin'},
                        '2': {name: 'meta.colon.kotlin'}
                    }
                },
                {
                    match: `(?<=[^:?]:)\\s*(${anyId}\\?*)\\s*(?!\\<)`,
                    captures: {
                        '1': {name: 'entity.name.type.class.kotlin'}
                    }
                },
                {
                    begin: `(?<=[^:?]:)\\s*(${anyId})\\s*(\\<)`,
                    beginCaptures: {
                        '1': {name: 'entity.name.type.class.kotlin'},
                        '2': {name: 'punctuation.bracket.angle.kotlin'}
                    },
                    end: '\\>\\?*',
                    endCaptures: {
                        '0': {name: 'punctuation.bracket.angle.kotlin'}
                    },
                    patterns: [{include: '#type-only-context'}]
                },
                {
                    begin: `(?<=[^:?]:)\\s*([(])`,
                    beginCaptures: {
                        '1': {name: 'punctuation.paren.open.kotlin'}
                    },
                    end: '[)]\\?*',
                    endCaptures: {
                        '0': {name: 'punctuation.paren.close.kotlin'}
                    },
                    patterns: [{include: '#type-only-context'}]
                }
            ]
        },
    },
    uuid: '98ac76da-e221-416c-9dc2-63e0652b0d37',
    patterns: [
        {
            include: '#code'
        }
    ],
    name: 'Kotlin',
    scopeName: 'source.kotlin'
}

export function checkIncludes(obj: any, repKeys: string[]) {
    if (obj.include) {
        let key = obj.include
        assert(_.isString(key))
        key = key.replace('#', '')
        assert(repKeys.indexOf(key) != -1, key)
        return
    }

    if (_.isArray(obj)) {
        for (const element of obj) {
            checkIncludes(element, repKeys)
        }
    } else if (_.isObject(obj)) {
        for (const key of _.keys(obj)) {
            const value = obj[key]
            checkIncludes(value, repKeys)
        }
    }
}

