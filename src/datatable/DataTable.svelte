<script>
	import { beforeUpdate, createEventDispatcher, onMount } from 'svelte';
	import Fuse from 'fuse.js';
	import { Icon, Spacer, Button } from 'smelte';

	import Paginate from './Paginate.svelte';
	import { debounce } from './debounce';
	import * as local from './local';
	import { collect, exportExcel, print } from './data-grid';

	import { immerStore } from './stores';

	export let title = '';
	export let customButtons = [];
	export let clickable = true;
	export let printable = true;
	export let exportable = true;
	export let searchable = true;
	export let searching = false;
	export let searchInputRef = null;
	export let searchInput = '';

	export let sortable = true;
	export let sortColumn = -1;
	let sortIndex = -1;
	export let sortType = 'asc';

	export let currentPerPage = 10;
	export let perPageOptions = [];
	export let currentPage = 1;
	export let rowCount = 0;
	export let pageCount = 0;
	export let selected = 0;
	export let perPage = [10, 20, 30, 40, 50];
	export let paginate = { size: perPage[0], page: 1 };
	export let defaultPerPage = null;
	export let exactSearch = false;		

	export let columns = [];
	export let processMode = 'local';
	// local
	export let rows = [];
	export let paginatedRows = [];
	// server
	export let paged = { paginate: paginate };
	export let getList = null;

	export let wrapperClasses = "rounded elevation-3 relative text-sm overflow-x-auto min-w-full";

	const dispatch = createEventDispatcher();
	let isServerProcess = false;

	const paginated = immerStore({
		paginatedRows,
		rows,
		paginate,
		size: currentPerPage,
		page: currentPage,
	});

	export function search(e) {
		searching = !searching;
		if (searching) {
			setTimeout(() => searchInputRef.focus(), 100);
		}
	}

	export function setSortIcon(index) {
		if (!sortable)
			return;
		if (sortColumn === index) {
			sortType = sortType === 'asc' ? 'desc' : 'asc';
		} else {
			sortType = 'asc';
			sortColumn = index;
		}
		sortType = sortType, sortColumn = sortColumn;
	}

	export function setPerPageOptions() {
		let options = perPage;
		// Force numbers
		options = options.map( v => parseInt(v));		
		// Set current page to first value
		currentPerPage = options[0];	
		// Sort options
		options.sort((a,b) => a - b);	
		// And add "All"
		options.push(-1);	
		// If defaultPerPage is provided and it's a valid option, set as current per page
		if (options.indexOf(defaultPerPage) > -1) {
			currentPerPage = parseInt(defaultPerPage);
		}	
		console.log('currentPerPage', currentPerPage, options);
		currentPerPage = currentPerPage, perPageOptions = options;
	}

	export function click(row) {
		if (!clickable) {
			return;
		}
		if (getSelection().toString()) {
			// Return if some text is selected instead of firing the row-click event.
			return;
		}
		dispatch('row-click', row);
		// console.log('click', row);
	}

	export function sort(index) {
		if (index > -1) {
			setSortIcon(index);
			getPaged({colName: columns[index].field, direction: sortType});				
		}
	}

	onMount(() => {
		setPerPageOptions();
		if (rows) {			
			getPaged({ rows });	
		}
	});

	$: isServerProcess = processMode == 'server';

  // export let asc = false;
  // let sortBy = null;

	// $: sorted = sort(sortBy);
	
	function getPagedLocal(props, pred) { 		
		const values = local.getPaged(props, pred, {	
			paginate, selected,
			currentPage, currentPerPage,
            sortable, sortColumn, sortType, 
			searchInput, exactSearch,
			rowCount, pageCount, 
			rows, columns	
		});
		({	paginate, selected,
			currentPage, currentPerPage,
            sortable, sortColumn, sortType,
			searchInput, exactSearch,
			rowCount, pageCount,
			rows, paginatedRows
		} = values);
		console.log('values', values);
		update(paginatedRows, currentPerPage, selectedPage);
	}

	function getPagedServer(props, pred, paged, cb) {
        const { paginate, getList } = paged;
        if (getList && (!pred || pred(paginate))) {
            const p = Object.assign({}, paginate, props);
            getList(p).then(data => {
                console.log('getPagedServer ', data );
                cb(data);
            });		
        }
	}
	
	function updateServer(paged) {
		const { paginate } = paged;
		rowCount = paginate.total;
		pageCount = paginate.pages;				
		currentPage = paginate.page;
		if (paged.getList) {
			getList = paged.getList;	
		}
	}

	function updatePaged(data) {
		updateServer(data);
		update(data.rows, data.paginate.size, data.paginate.page);
	}

	function getPaged(props, pred) {
		console.log('props', props);
		if (isServerProcess) {
			getPagedServer(props, pred, { paginate, getList }, updatePaged);
		} else {
			getPagedLocal(props, pred);
		}	
	}	
	
	$: selectedPage = selected + 1;
	let previous;	
	function update(paginatedRows, size, page) {
		try {
			paginated.update($paginated => {
				$paginated.paginatedRows = paginatedRows;
				$paginated.rows = rows;
				$paginated.size = size;
				$paginated.page = page;
			});
		}
		catch(e) {
			console.log('update error', e);
		}
		previous = $paginated;
	}

	$: {
		// console.log('$paginated - previous - selectedPage ', $paginated.page, previous ? previous.page : -1, selectedPage);
		if (previous) {
			if (!isServerProcess && rows !== previous.rows) {
				getPaged({ rows });
			}
			if (currentPerPage !== previous.size) {
				getPaged({ size: currentPerPage });
			}
			if (selectedPage !== previous.page) {
				getPaged({ page: selectedPage });
				paginated.update($paginated => {
					$paginated.page = selectedPage;
				});
			}
		}
		previous = $paginated;
	}

	let prevPaged;
	$: if (paged.rows && paged !== prevPaged) {
		updatePaged(paged);
		prevPaged = paged;
		console.log('paged !== prevPaged ', $paginated );
	}

	let prevSearchInput = '';
	beforeUpdate(() => {			        
		if (searchInput != prevSearchInput) {
			debounce(() => {
				if (searchInput != prevSearchInput) {
					console.log('searchInput changed', searchInput);
					getPaged({ searchText: searchInput });
					prevSearchInput = searchInput;
				}
			}, 400)();
		}	        
	});

	const buttonProps = {
    color: "gray",
    iconClass: "text-gray-800",
    add: "p-2",
    remove: "p-4 m-4 px-4",
		flat: true,
		text: true,
    light: true,
  };
</script>

<div class="material-table">
	<div class="table-header">
		<span class="table-title">{title}</span>
		<div class="flex items-center justify-end text-gray-800 text-sm w-full h-12">
			{#each customButtons as button, x}
				{#if !button.hide}
					<Button {...buttonProps} icon={button.icon} on:click="{click}" />
				{/if}
			{/each}
			{#if printable}
				<Button icon="print" {...buttonProps} on:click="{() => print(columns, rows)}" />
			{/if}
			{#if exportable}
				<Button icon="description" {...buttonProps} on:click="{() => exportExcel(columns, rows, title)}" />
			{/if}
			{#if searchable}
				<Button icon="search" {...buttonProps} on:click="{search}" />
			{/if}
		</div>
	</div>
	{#if searching}
	<div>
		<div id="search-input-container">
			<label>
				<input type="search" id="search-input" bind:this={searchInputRef}
				 	class="form-control" placeholder="Search data"
					bind:value="{searchInput}">
			</label>
		</div>
	</div>
	{/if}

  <table class="{wrapperClasses}">
		<thead class="items-center">
			<tr>
			{#each columns as column, i}
				<slot name="header">
					<th on:click="{() => sort(i)}"
								class="{ column.numeric ? ' numeric' : ''}"
								style="width: { column.width ? column.width : 'auto' }">
						<div class="sort-wrapper">
							{#if column.component === 'action'}
								&nbsp;            
							{:else if column.sortable !== false && column.component !== 'action'}
								<span class="sort" class:asc={sortType === 'desc' && sortColumn === i}>
									<Icon small color="text-gray-400">arrow_downward</Icon>
								</span>
							{/if}
							<span>{column.label || column.field}</span>
						</div>
					</th>
				</slot>
			{/each}
			</tr>
		</thead>

		<tbody>
			{#each $paginated.paginatedRows as row, y}
				<tr class="{ clickable ? 'clickable' : '' }" on:click="{() => click(row)}">
					{#each columns as column, x}
						<td>
							{#if column.html}
								{@html collect(row, column.field)}
							{:else}
								{ collect(row, column.field) }   
							{/if}     
						</td>    
					{/each}
				</tr>
			{/each}
		</tbody>
{#if paginate}
	<slot name="pagination">
		<tfoot>
			<tr>
				<td colspan="100%">
					<div class="flex justify-between items-center text-gray-700 text-sm w-full h-8">
						<div>
							<label>
								<span>Rows per page:</span>
								<select bind:value="{currentPerPage}">
									{#each perPageOptions as option, x}
										<option value={option}>
										{ option === -1 ? 'All' : option }
										</option>
									{/each}
								</select>
							</label>
						</div>
						<Spacer />
						<div>
							{(currentPage - 1) * currentPerPage ? (currentPage - 1) * currentPerPage : 1}
								-{Math.min(rowCount, currentPerPage * currentPage)} of {rowCount}
						</div>
						<Spacer />
						<div>
							<Paginate
								bind:pageCount={pageCount}
								marginPages="2"
								pageRange="4"
								containerClass="flex w-full justify-between"
								pageLinkClass="m-auto py-1 px-2"
								prevLinkClass="mr-1 py-1"
								nextLinkClass="ml-1 py-1"
								bind:selected="{selected}"
								activeClass="active"
								noLiSurround="{false}"
								>	
								<i class="material-icons align-middle" slot="prevContent">chevron_left</i>
								<i class="material-icons align-middle" slot="nextContent">chevron_right</i>			
							</Paginate>
						</div>
					</div>
				</td>
			</tr>
		</tfoot>
	</slot>
{/if}		
  </table>
</div>

<style>
  th, td {
    @apply p-2 px-3 font-normal;
  }
  th:first-child, td:first-child {
    @apply text-left border-r;
  }
  th {
    @apply text-gray-600 text-xs;
  }
  th .asc {
    transform: rotate(180deg);
  }
  th .sort-wrapper {
    @apply flex items-center justify-start;
  }
  th:first-child .sort-wrapper {
    @apply justify-start;
  }
  th .sort {
    @apply w-4 h-4 opacity-0 transition-fast;
  }
  th:hover {
    @apply text-black transition-fast;
  }
  th:hover .sort {
    @apply opacity-100;
  }
  tr {
    @apply border-gray-200 border-t border-b px-3;
  }
  tr:hover {
    @apply bg-gray-50;
  }
  tr.selected {
    @apply bg-primary-50;
  }
</style>