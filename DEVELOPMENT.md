# Frontend development

## Local run and debug

```bash
cd app/frontend
npx expo install react-dom react-native-web babel-preset-expo @babel/core
# then run
npx expo start
# --web will open in the default browser
```

F5 will run in chrome with VSCode attached as debugger.  See launch.json "chrome" config.

## Linting react

ESLint extension in VSCode
`npm install --save-dev eslint-config-react-app eslint@^8.0.0`

## iOS

`expo start --ios` - doesn't work  
`expo run:ios` - works but runs the dev build  
