import {schemaMigrations, addColumns} from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'transaction_templates',
          columns: [
            {name: 'icon', type: 'string'},
            {name: 'color', type: 'string'},
            {name: 'tags', type: 'string'},
            {name: 'sort_order', type: 'number'},
          ],
        }),
      ],
    },
  ],
});
