/**
 * Tree-sitter grammar for the Bit programming language
 * https://tree-sitter.github.io/tree-sitter/
 */

module.exports = grammar({
  name: "bit",

  extras: ($) => [/\s/, $.line_comment, $.block_comment],

  conflicts: ($) => [
    [$.expression_statement, $.assignment_statement],
    [$.use_statement],
  ],

  rules: {
    source_file: ($) => repeat($._statement),

    _statement: ($) =>
      choice(
        $.variable_declaration,
        $.assignment_statement,
        $.compound_assignment_statement,
        $.function_declaration,
        $.satellite_declaration,
        $.type_declaration,
        $.use_statement,
        $.for_statement,
        $.while_statement,
        $.if_statement,
        $.return_statement,
        $.raise_statement,
        $.send_statement,
        $.bail_statement,
        $.break_statement,
        $.continue_statement,
        $.expression_statement,
      ),

    // let id = value;
    variable_declaration: ($) =>
      seq(
        "let",
        field("name", $.identifier),
        "=",
        field("value", $._expression),
        ";",
      ),

    // id = value;
    assignment_statement: ($) =>
      seq(
        field("left", $._assignable),
        "=",
        field("right", $._expression),
        ";",
      ),

    // id += value; etc.
    compound_assignment_statement: ($) =>
      seq(
        field("left", $._assignable),
        field("operator", choice("+=", "-=", "*=", "/=", "%=", "&=", "|=")),
        field("right", $._expression),
        ";",
      ),

    _assignable: ($) =>
      choice($.identifier, $.member_expression, $.index_expression),

    // fn name(params) { body }
    function_declaration: ($) =>
      seq(
        "fn",
        field("name", $.identifier),
        field("parameters", $.parameter_list),
        field("body", $.block),
      ),

    parameter_list: ($) =>
      seq(
        "(",
        optional(seq($.identifier, repeat(seq(",", $.identifier)))),
        ")",
      ),

    block: ($) => seq("{", repeat($._statement), "}"),

    // satl name with chan { body }
    satellite_declaration: ($) =>
      seq(
        "satl",
        field("name", $.identifier),
        "with",
        field("channel", $.identifier),
        field("body", $.block),
      ),

    // send value to chan;
    send_statement: ($) =>
      seq(
        "send",
        field("value", $._expression),
        "to",
        field("channel", $.identifier),
        ";",
      ),

    // type Dog { ... }
    type_declaration: ($) =>
      seq(
        "type",
        field("name", $.identifier),
        "{",
        repeat($.function_declaration),
        "}",
      ),

    // use a / use a as b / use a for b, c
    use_statement: ($) =>
      prec(
        1,
        seq(
          "use",
          field("module", $.identifier),
          optional(
            choice(
              seq("as", field("alias", $.identifier)),
              seq(alias("for", $.use_for), field("items", $.import_list)),
            ),
          ),
        ),
      ),

    import_list: ($) => seq($.identifier, repeat(seq(",", $.identifier))),

    // for i in 0..100 { }
    for_statement: ($) =>
      seq(
        "for",
        field("variable", $.identifier),
        "in",
        field("range", $.range_expression),
        field("body", $.block),
      ),

    range_expression: ($) =>
      seq(
        field("start", $._expression),
        field("operator", choice("..=", "..")),
        field("end", $._expression),
      ),

    // while cond { }
    while_statement: ($) =>
      seq("while", field("condition", $._expression), field("body", $.block)),

    // if cond { } else if cond { } else { }
    if_statement: ($) =>
      seq(
        "if",
        field("condition", $._expression),
        field("consequence", $.block),
        optional(field("alternative", $.else_clause)),
      ),

    else_clause: ($) => seq("else", choice($.if_statement, $.block)),

    // return expr;
    return_statement: ($) =>
      seq("return", optional(field("value", $._expression)), ";"),

    // raise expr;
    raise_statement: ($) => seq("raise", field("value", $._expression), ";"),

    // bail expr;
    bail_statement: ($) => seq("bail", field("value", $._expression), ";"),

    break_statement: ($) => seq("break", ";"),
    continue_statement: ($) => seq("continue", ";"),

    expression_statement: ($) => seq($._expression, ";"),

    _expression: ($) =>
      choice(
        $.binary_expression,
        $.unary_expression,
        $.call_expression,
        $.member_expression,
        $.index_expression,
        $.anonymous_function,
        $.launch_expression,
        $.recv_expression,
        $.identifier,
        $.integer_literal,
        $.decimal_literal,
        $.string_literal,
        $.bool_literal,
        $.null_literal,
        $.grouped_expression,
      ),

    // launch name  →  returns satellite handle
    launch_expression: ($) =>
      prec(9, seq("launch", field("satellite", $.identifier))),

    // recv handle  →  blocks until value received
    recv_expression: ($) =>
      prec(9, seq("recv", field("handle", $._expression))),

    binary_expression: ($) => {
      const table = [
        [1, choice("||", "|")],
        [2, choice("&&", "&")],
        [3, "^"],
        [4, choice("==", "!=")],
        [5, choice(">", "<")],
        [6, choice("+", "-")],
        [7, choice("*", "/", "%")],
      ];
      return choice(
        ...table.map(([p, op]) =>
          prec.left(
            p,
            seq(
              field("left", $._expression),
              field("operator", op),
              field("right", $._expression),
            ),
          ),
        ),
      );
    },

    unary_expression: ($) =>
      prec(
        8,
        seq(
          field("operator", choice("-", "!")),
          field("operand", $._expression),
        ),
      ),

    call_expression: ($) =>
      prec(
        10,
        seq(
          field("function", $._expression),
          field("arguments", $.argument_list),
        ),
      ),

    argument_list: ($) =>
      seq(
        "(",
        optional(seq($._expression, repeat(seq(",", $._expression)))),
        ")",
      ),

    member_expression: ($) =>
      prec(
        11,
        seq(
          field("object", $._expression),
          ".",
          field("property", $.identifier),
        ),
      ),

    index_expression: ($) =>
      prec(
        11,
        seq(
          field("object", $._expression),
          "[",
          field("index", $._expression),
          "]",
        ),
      ),

    anonymous_function: ($) =>
      seq("fn", field("parameters", $.parameter_list), field("body", $.block)),

    grouped_expression: ($) => seq("(", $._expression, ")"),

    integer_literal: ($) => /[0-9]+/,

    decimal_literal: ($) => /[0-9]+\.[0-9]+/,

    string_literal: ($) => seq('"', repeat(choice(/[^"\\]+/, /\\./)), '"'),

    bool_literal: ($) => choice("true", "false"),

    null_literal: ($) => "null",

    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    line_comment: ($) => token(seq("#", /[^\[\n][^\n]*/)),

    block_comment: ($) =>
      token(seq("#[", repeat(choice(/[^\]]/, /\][^#]/)), "]#")),
  },
});
