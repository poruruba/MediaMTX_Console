const components_utils = {
  comp_file: {
    props: ['id', 'accept', 'multiple'],
    template: `
    <span>
      <input type="file" v-bind:id="id" v-bind:accept="accept" v-on:change="file_open" v-on:click="file_click" v-bind:multiple="multiple">
    </span>
    `,
    methods: {
      file_click: function (e) {
        e.target.value = '';
        this.files = [];
        this.$emit("input", this.files);
        this.$emit("change", this.files);
      },
      file_open: function (e) {
        this.files = e.target.files;
        this.$emit("input", this.files);
        this.$emit("change", this.files);
      },
    }
  },
  comp_datetime: {
    props: ['value'],
    template: `
    <span>
        <input class="form-control" type="datetime-local" v-bind:value="datetime" v-on:input="do_input" v-on:change="do_change">
    </span>
    `,
    computed: {
      datetime: function(){
        const to2d = (d) =>{
          return ("00" + d).slice(-2);
        };        
        const toDatetimeString = (tim) => {
          var d = new Date(tim);
          return d.getFullYear() + '-' + to2d(d.getMonth() + 1) + '-' + to2d(d.getDate()) + 'T' + to2d(d.getHours()) + ':' + to2d(d.getMinutes()); 
        };
        
        return toDatetimeString(this.value);
      }
    },
    methods: {
      do_input: function(event){
        return this.$emit("input", new Date(event.target.value).getTime());
      },
      do_change: function(event){
        return this.$emit("change", event );
      }
    }
  },
  comp_date: {
    props: ['value'],
    template: `
    <span>
        <input class="form-control" type="date" v-bind:value="datetime" v-on:input="do_input" v-on:change="do_change">
    </span>
    `,
    computed: {
      datetime: function(){
        const to2d = (d) =>{
          return ("00" + d).slice(-2);
        };        
        const toDatetimeString = (tim) => {
          var d = new Date(tim);
          return d.getFullYear() + '-' + to2d(d.getMonth() + 1) + '-' + to2d(d.getDate()); 
        };
        
        return toDatetimeString(this.value);
      }
    },
    methods: {
      do_input: function(event){
        var date = new Date(event.target.value);
        return this.$emit("input", date.getTime() + date.getTimezoneOffset() * 60 * 1000 );
      },
      do_change: function(event){
        return this.$emit("change", event );
      }
    }
  },
  comp_time: {
    props: ['value'],
    template: `
    <span>
        <input class="form-control" type="time" v-bind:value="datetime" v-on:input="do_input" v-on:change="do_change">
    </span>
    `,
    computed: {
      datetime: function(){
        const to2d = (d) =>{
          return ("00" + d).slice(-2);
        };        
        const toTimeString = (tim) => {
          var d = new Date(tim);
          return to2d(d.getUTCHours()) + ':' + to2d(d.getUTCMinutes()); 
        };
        
        return toTimeString(this.value);
      }
    },
    methods: {
      do_input: function(event){
        var date = new Date("1970-01-01T" + event.target.value + ":00+00:00");
        return this.$emit("input", date.getTime());
      },
      do_change: function(event){
        return this.$emit("change", event );
      }
    }
  }  
}
