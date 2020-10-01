# PingMC

A promise-based ES6 Minecraft pinger in Node.js

## 📦 Install
`npm i pingmc`

## Example
```javascript
import { PingMC } from "pingmc"; // ES6
// OR
const { PingMC } = require("pingmc"); // ES5

new PingMC("mc.hypixel.net")
    .ping()
    .then((data) => console.log(data))
    .catch((error) => console.log(error))

```

## License
[MIT](LICENSE.md)
