<script>
	import { onMount } from 'svelte';
  import { Button, Checkbox, Switch, Snackbar } from "smelte";
  // export let name;
  import DataTable from './datatable';
  import data from './data/data';
  import columndata from './data/columndata';
  import getList from './data';

  let isReady = false;
  let process;
  let dataTable;
  let showSnackbar = false;
  let isServerProcess = false;

  onMount(() => {
		isReady = true;
  });
  
  $: {    
    process = isServerProcess ? 'server' : 'local';
    if (isReady) {
      if (isServerProcess) {        
        getList().then(function(data){
          console.log('server: ', data);
          dataTable.$set(data);
        });	
      } else {
        console.log('local: ', data);
        dataTable.$set({rows: data});
      }
    }    
  }      
</script>

<div class="container mx-auto h-full items-center">
  <h3>Data Table!</h3>
  <div class="py-6">
    <Button>Button</Button>
  </div>
  <div class="py-6">
    <Switch label="{process}" bind:value={isServerProcess} />
  </div>

  <DataTable bind:this="{dataTable}" columns="{columndata}" {process} />

  <Snackbar bind:value={showSnackbar}>
    <div>Have a nice day.</div>
    <div slot="action">
      <Button text on:click={() => (showSnackbar = false)}>Dismiss</Button>
    </div>
  </Snackbar>
</div>
