# PingMC

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-yellowgreen.svg)](http://standardjs.com/)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

A promise-based ES6 Minecraft pinger in Node.js

## Install
`npm i https://github.com/MrZillaGold/PingMC.git`

## Example
```javascript
import { ping } from "PingMC";

// Promise
ping("localhost:25565")
  .then(console.log)
  .catch(console.error);

// Async
ping("localhost:25565", (error, result) => {
  if (error) return console.error(error)

  console.log(result)
});
```

## License
[MIT](LICENSE.md)
