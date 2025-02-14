if ({{IF0}}) {
    {{DO0}};
}{{#each elseif}}
else if ({{IF}}) {
    {{DO}};
}{{/each}}{{#if hasElse}}
else {
    {{ELSE}};
}{{/if}}
