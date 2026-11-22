import { database, store } from "./write-path-fixtures";

test("importing the fixtures starts no database and no store", () => {
  expect(database).toBeUndefined();
  expect(store).toBeUndefined();
});
