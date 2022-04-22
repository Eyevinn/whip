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

        reporters: ["mocha"],

        browsers: ["ChromeHeadless"],

        singleRun: true
    });
};
