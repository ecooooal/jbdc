module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Bundles drizzle-kit's generated migration SQL into the app and tests.
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
