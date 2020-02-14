const makeItemLink = (slug) => `#${slug}`;
const findExistingDefinition = (word, collection) =>
  collection.find((item) => item.data.title === word);

module.exports = function (config) {
  // Add a filter using the Config API
  config.addFilter('linkTarget', makeItemLink);

  config.addFilter('linkIfExistsInCollection', (word, collection) => {
    const existingDefinition = findExistingDefinition(word, collection);

    if (existingDefinition) {
      return `<a href="${makeItemLink(
        existingDefinition.data.slug
      )}">${word}</a>`;
    }

    return word;
  });

  config.addFilter('linkSubTermIfDefined', (subTermData, collection) => {
    const existingDefinition = findExistingDefinition(
      subTermData.full_title,
      collection
    );

    if (existingDefinition) {
      return `<a href="${makeItemLink(
        existingDefinition.data.slug
      )}" aria-label="${subTermData.full_title}">${subTermData.text}</a>`;
    }

    return `<span aria-label="${subTermData.full_title}">${subTermData.text}</span>`;
  });

  // just a debug filter to lazily inspect the content of anything in a template
  config.addFilter('postInspect', function (post) {
    console.log(post);
  });

  config.addShortcode('definitionFlag', (flag) => {
    const cleanText = new Map([
      [
        'avoid',
        {
          class: 'avoid',
          text: 'Avoid'
        }
      ],
      [
        'better-alternative',
        {
          class: 'better',
          text: 'Better alternate'
        }
      ],
      [
        'tool',
        {
          class: 'tool',
          text: ''
        }
      ]
    ]);

    if (flag) {
      const info = cleanText.get(flag.level.toLowerCase());

      const sep = flag.text && info.text ? '—' : '';
      const text = flag.text ? [info.text, flag.text].join(sep) : info.text;

      return `<p class="word__signal word__signal--${info.class}">${text}</p>`;
    }

    return '<p class="word__signal"></p>';
  });

  // NOTE (ovlb): this will not be remembered as the best code i’ve written. if anyone seeing this has a better solution then the following to achieve sub groups of the definitions: i am happy to get rid of it
  config.addCollection('tableOfContent', (collection) => {
    const allItems = collection
      .getFilteredByGlob('./11ty/definitions/*.md')
      .filter((word) => !word.data.skip_in_table_of_content)
      .sort((a, b) => {
        const { title: firstTitle } = a.data;
        const { title: secondTitle } = b.data;
        const sortA = firstTitle.toLowerCase().replace(/^-/, '');
        const sortB = secondTitle.toLowerCase().replace(/^-/, '');

        // `localeCompare()` is super cool: http://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
        return sortA.localeCompare(sortB);
      });

    const split = {
      notLetters: {
        title: '#',
        definitions: []
      },
      aToE: {
        title: 'A–E',
        definitions: []
      },
      fToL: {
        title: 'F–L',
        definitions: []
      },
      mToS: {
        title: 'M–S',
        definitions: []
      },
      tToZ: {
        title: 'T–Z',
        definitions: []
      }
    };

    allItems.forEach((word) => {
      const { title } = word.data;
      const { notLetters, aToE, fToL, mToS, tToZ } = split;
      const sortableTitle = title.replace(/^-/, '');

      if (/^[a-e]/gim.test(sortableTitle)) {
        return aToE.definitions.push(word);
      }

      if (/^[f-l]/i.test(sortableTitle)) {
        return fToL.definitions.push(word);
      }

      if (/^[m-s]/i.test(sortableTitle)) {
        return mToS.definitions.push(word);
      }

      if (/^[t-z]/i.test(sortableTitle)) {
        return tToZ.definitions.push(word);
      }

      // no reg ex as the fallback to avoid testing for emojis and numbers
      notLetters.definitions.push(word);
    });

    return Object.keys(split).map((key) => {
      const { title, definitions } = split[key];

      return { title, definitions };
    });
  });

  config.addCollection('definedWords', (collection) => {
    const definedWordsCollection = collection
      .getFilteredByGlob('./11ty/definitions/*.md')
      .filter((word) => word.data.defined)
      .sort((a, b) => {
        // `localeCompare()` is super cool: http://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
        return a.data.title
          .toLowerCase()
          .localeCompare(b.data.title.toLowerCase());
      });


    const transformTemplate = word => {
      const { pkg, ...data } = word.template.dataCache
      return {
        ...data,
        html: require("markdown-it")().render(word.template.inputContent)
      }
    }

    const definedWords = definedWordsCollection.reduce((object, word) => {
      return {
        ...object,
        [word.data.slug]: transformTemplate(word),
      };
    }, {});

    // write api.json to dist
    require("fs")
      .writeFile("./dist/api.json", JSON.stringify(definedWords, null, 2), (err, ok) => {
        console.log(err, ok)
      })

    return definedWordsCollection
  });

  const mdIt = require('markdown-it')({
    html: true
  });
  const prism = require('markdown-it-prism');
  const anchor = require('markdown-it-anchor');

  mdIt.use(prism);
  mdIt.use(anchor);

  config.setLibrary('md', mdIt);

  // You can return your Config object (optional).
  return {
    dir: {
      input: '11ty',
      output: 'dist'
    },
    templateFormats: ['njk', 'md'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
};
