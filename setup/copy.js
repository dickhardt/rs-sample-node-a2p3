/*
* copies source to destination if destination does not exist
*/

var fs = require('fs')

var source = process.argv[2]
var destination = process.argv[3]

if (!source || !destination) {
  console.error('usage: copy.js <source> <destination>')
  process.exit(1)
}
if (!fs.existsSync(source)) {
  console.error('could not find "'+source+'"')
  process.exit(1)
}
if (!fs.existsSync(destination)) {
  var data = fs.readFileSync( source )
  fs.writeFileSync( destination, data )
  console.log('Remember to insert your CLI device ID into config.json.')
} else {
  console.log('Using existing config.json.')
}
