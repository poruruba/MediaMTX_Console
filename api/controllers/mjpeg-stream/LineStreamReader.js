class LineStreamReader {
  constructor(reader, delimiter = '\n') {
    this.reader = reader;
    this.delimiter = delimiter;
    this.buffer = '';
    this.lines = [];
  }
  
  push(value){
      this.process(value);
      
      if (this.lines.length > 0) {
        const line = this.lines.shift();
        return { done: false, value: line };
      }else{
        return { done: false, value: undefined };
      }
  }
  
  process(value){
      this.buffer += value;
      const parts = this.buffer.split(this.delimiter);
      this.buffer = parts.pop();
      this.lines.push(...parts);
  }
  
  async read() {
    while (true) {
      if (this.lines.length > 0) {
        const line = this.lines.shift();
        return { done: false, value: line };
      }else if( !this.reader ){
        return { done: false, value: undefined };
      }

      const { value, done } = await this.reader.read();
      if (done) {
        return { done: true };
      }

      this.process(value);
    }
  }
}

module.exports = LineStreamReader;