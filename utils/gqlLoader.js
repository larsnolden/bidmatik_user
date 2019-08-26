const fs = require('fs')

export default (filePath) => {
  return fs.readFileSync(filePath, 'utf-8')
}