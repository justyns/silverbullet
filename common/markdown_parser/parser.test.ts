import {
  collectNodesOfType,
  findNodeOfType,
  renderToText,
} from "@silverbulletmd/silverbullet/lib/tree";
import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { parseMarkdown } from "./parser.ts";
import { extractHashtag, renderHashtag } from "../../plug-api/lib/tags.ts";

const sample1 = `---
type: page
tags:
- hello
- world
---
# This is a doc

Here is a [[wiki link]] and a [[wiki link|alias]].

Supper`;

const sampleInvalid1 = `---
name: Zef
# This is a doc

Supper`;

Deno.test("Test parser", () => {
  let tree = parseMarkdown(sample1);
  // console.log("tree", JSON.stringify(tree, null, 2));
  // Check if rendering back to text works
  assertEquals(renderToText(tree), sample1);

  // Find wiki link and wiki link alias
  const links = collectNodesOfType(tree, "WikiLink");
  assertEquals(links.length, 2);
  const nameNode = findNodeOfType(links[0], "WikiLinkPage");
  assertEquals(nameNode!.children![0].text, "wiki link");

  // Check if alias is parsed properly
  const aliasNode = findNodeOfType(links[1], "WikiLinkAlias");
  assertEquals(aliasNode!.children![0].text, "alias");

  // Find frontmatter
  let node = findNodeOfType(tree, "FrontMatter");
  assertNotEquals(node, undefined);
  tree = parseMarkdown(sampleInvalid1);
  node = findNodeOfType(tree, "FrontMatter");
  // console.log("Invalid node", node);
  assertEquals(node, undefined);
});

const inlineAttributeSample = `
Hello there [a link](http://zef.plus)
[age: 100]
[age:: 200]

Here's a more [ambiguous: case](http://zef.plus)

And one with nested brackets: [array: [1, 2, 3]]
`;

Deno.test("Test inline attribute syntax", () => {
  const tree = parseMarkdown(inlineAttributeSample);
  // console.log("Attribute parsed", JSON.stringify(tree, null, 2));
  const attributes = collectNodesOfType(tree, "Attribute");
  let nameNode = findNodeOfType(attributes[0], "AttributeName");
  assertEquals(nameNode!.children![0].text, "age");
  let valueNode = findNodeOfType(attributes[0], "AttributeValue");
  assertEquals(valueNode!.children![0].text, "100");

  nameNode = findNodeOfType(attributes[1], "AttributeName");
  assertEquals(nameNode!.children![0].text, "age");
  valueNode = findNodeOfType(attributes[1], "AttributeValue");
  assertEquals(valueNode!.children![0].text, "200");

  nameNode = findNodeOfType(attributes[2], "AttributeName");
  assertEquals(nameNode!.children![0].text, "array");
  valueNode = findNodeOfType(attributes[2], "AttributeValue");
  assertEquals(valueNode!.children![0].text, "[1, 2, 3]");
});

Deno.test("Test template directive parsing", () => {
  const tree = parseMarkdown("Simple {{name}} and {{count({ page })}}");
  assert(findNodeOfType(tree, "TemplateDirective"));
});

const multiStatusTaskExample = `
* [ ] Task 1
- [x] Task 2
* [TODO] Task 3
`;

Deno.test("Test multi-status tasks", () => {
  const tree = parseMarkdown(multiStatusTaskExample);
  // console.log("Tasks parsed", JSON.stringify(tree, null, 2));
  const tasks = collectNodesOfType(tree, "Task");
  assertEquals(tasks.length, 3);
  // Check " " checkbox state parsing
  assertEquals(tasks[0].children![0].children![1].text, " ");
  assertEquals(tasks[1].children![0].children![1].text, "x");
  assertEquals(tasks[2].children![0].children![1].text, "TODO");
});

const commandLinkSample = `
{[Some: Command]}
{[Other: Command|Alias]}
{[Command: Space | Spaces ]}
`;

Deno.test("Test command links", () => {
  const tree = parseMarkdown(commandLinkSample);
  const commands = collectNodesOfType(tree, "CommandLink");
  // console.log("Command links parsed", JSON.stringify(commands, null, 2));
  assertEquals(commands.length, 3);
  assertEquals(commands[0].children![1].children![0].text, "Some: Command");
  assertEquals(commands[1].children![1].children![0].text, "Other: Command");
  assertEquals(commands[1].children![3].children![0].text, "Alias");
  assertEquals(commands[2].children![1].children![0].text, "Command: Space ");
  assertEquals(commands[2].children![3].children![0].text, " Spaces ");
});

const commandLinkArgsSample = `
{[Args: Command]("with", "args")}
{[Othargs: Command|Args alias]("other", "args", 123)}
`;

Deno.test("Test command link arguments", () => {
  const tree = parseMarkdown(commandLinkArgsSample);
  const commands = collectNodesOfType(tree, "CommandLink");
  assertEquals(commands.length, 2);

  const args1 = findNodeOfType(commands[0], "CommandLinkArgs");
  assertEquals(args1!.children![0].text, '"with", "args"');

  const args2 = findNodeOfType(commands[1], "CommandLinkArgs");
  assertEquals(args2!.children![0].text, '"other", "args", 123');
});

Deno.test("Test directive parser", () => {
  const simpleExample = `Simple {{.}}`;
  let tree = parseMarkdown(simpleExample);
  assertEquals(renderToText(tree), simpleExample);

  const eachExample = `{{#each .}}Sup{{/each}}`;
  tree = parseMarkdown(eachExample);

  const ifExample = `{{#if true}}Sup{{/if}}`;
  tree = parseMarkdown(ifExample);
  assertEquals(renderToText(tree), ifExample);

  const ifElseExample = `{{#if true}}Sup{{else}}Sup2{{/if}}`;
  tree = parseMarkdown(ifElseExample);
  assertEquals(renderToText(tree), ifElseExample);
  // console.log("Final tree", JSON.stringify(tree, null, 2));

  const letExample = `{{#let @p = true}}{{/let}}`;
  tree = parseMarkdown(letExample);
  assertEquals(renderToText(tree), letExample);
});

Deno.test("Test lua directive parser", () => {
  const simpleExample = `Simple \${{a=}}`;
  console.log(JSON.stringify(parseMarkdown(simpleExample), null, 2));
});

const hashtagSample = `
Hashtags, e.g. #mytag but ignore in code \`#mytag\`.
They can contain slashes like #level/beginner, single quotes, and dashes: #Mike's-idea.
Can be just #a single letter.
But no other #interpunction: #exclamation! #question?
There is a way to write #<tag with spaces>
These cannot span #<multiple
lines>
#no#spacing also works.
Hashtags can start with number if there's something after it: #3dprint #15-52_Trip-to-NYC.
But magazine issue #1 or #123 are not hashtags.
Should support other languages, like #żółć or #井号
`;

Deno.test("Test hashtag parser", () => {
  const tree = parseMarkdown(hashtagSample);
  const hashtags = collectNodesOfType(tree, "Hashtag");
  assertEquals(hashtags.length, 14);

  assertEquals(hashtags[0].children![0].text, "#mytag");
  assertEquals(hashtags[1].children![0].text, "#level/beginner");
  assertEquals(hashtags[2].children![0].text, "#Mike's-idea");
  assertEquals(hashtags[3].children![0].text, "#a");
  assertEquals(hashtags[4].children![0].text, "#interpunction");
  assertEquals(hashtags[5].children![0].text, "#exclamation");
  assertEquals(hashtags[6].children![0].text, "#question");
  assertEquals(hashtags[7].children![0].text, "#<tag with spaces>");
  // multiple lines not allowed
  assertEquals(hashtags[8].children![0].text, "#no");
  assertEquals(hashtags[9].children![0].text, "#spacing");
  assertEquals(hashtags[10].children![0].text, "#3dprint");
  assertEquals(hashtags[11].children![0].text, "#15-52_Trip-to-NYC");
  assertEquals(hashtags[12].children![0].text, "#żółć");
  assertEquals(hashtags[13].children![0].text, "#井号");
});

Deno.test("Test hashtag helper functions", () => {
  assertEquals(extractHashtag("#name"), "name");
  assertEquals(extractHashtag("#123-content"), "123-content");
  assertEquals(extractHashtag("#<escaped tag>"), "escaped tag");
  assertEquals(
    extractHashtag("#<allow < and # inside>"),
    "allow < and # inside",
  );

  assertEquals(renderHashtag("simple"), "#simple");
  assertEquals(renderHashtag("123-content"), "#123-content");
  assertEquals(renderHashtag("with spaces"), "#<with spaces>");
  assertEquals(renderHashtag("single'quote"), "#single'quote");
  // should behave like this for all characters in tagRegex
  assertEquals(renderHashtag("exclamation!"), "#<exclamation!>");
});
