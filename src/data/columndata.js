export default [ // Array of objects
  {
      label: 'First Name', // Column name
      field: 'fname', // Field name from row
      numeric: false, // Affects sorting
      html: false, // Escapes output if false.
  }, {
      label: 'Last Name',
      field: 'lname',
      numeric: false,
      html: false,
  }, {
      label: 'Age',
      field: 'age',
      numeric: true,
      html: false,
  }, {
      label: 'State',
      field: 'state',
      numeric: false,
      html: false,
  }, {
      label: 'Action',
      field: function (data) {
              return '<a href="#customers/' + data.id + '" class="waves-effect waves-light btn nopadding">Edit</a>';
          },
      numeric: false,
      html: true,
  }
];