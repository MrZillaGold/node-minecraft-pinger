# PingMC

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-yellowgreen.svg)](http://standardjs.com/)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

A promise-based ES6 Minecraft pinger in Node.js

## Install
`npm i pingmc`

## Example
```javascript
import { PingMC } from "pingmc";

new PingMC("mc.hypixel.net:25565")
    .ping()
    .then((data) => console.log(data))
    .catch((error) => console.log(error))

```

## License
[MIT](LICENSE.md)
