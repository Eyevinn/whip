module.exports = function (config) {
    config.set({

        frameworks: ["mocha", "karma-typescript"],

        files: [
            { pattern: "src/**/*.ts" },
            { pattern: "spec/**/*.ts" }
        ],

        preprocessors: {
            "**/*.ts": ["karma-typescript"]
        },

        karmaTypescript: {
            // karma-typescript 5.5.x + TypeScript 5.x: target "esnext" emits
            // syntax the bundler's acorn parser can't wrap correctly, leaving
            // `exports` undefined in the browser. ES2020 is fully supported by
            // Chrome Headless 146 and passes through the bundler cleanly.
            compilerOptions: {
                module: "commonjs",
                target: "ES2020"
            }
        },

        reporters: ["mocha"],

        browsers: ["ChromeHeadless"],

        singleRun: true
    });
};
