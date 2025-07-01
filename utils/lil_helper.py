import pandas as pd
import json


df = pd.read_csv(r"C:\Users\R\Desktop\thesis\data3\qst.csv")

new_df = pd.DataFrame(columns=df.columns)

app_data = {}

with open(r"C:\Users\R\Desktop\thesis\data3\app_data.json", 'r', encoding='utf-8') as f:
    app_data = json.load(f)

for index, row in df.iterrows():
    print(f"Row {index}:")
    print("UUID:", row["uuid"])
    for a_data in app_data["result"]:
        if row['uuid'] == a_data['user_uuid']:
            for a_room in a_data['exp_rooms']:
                tmp_new_row = row.copy()
                tmp_new_row["experiment_type"] = a_data["experiment_type"]
                tmp_new_row["topic"] = a_room["topic"]
                tmp_new_row["bias_tendency"] = a_room["bias_tendency"]
                tmp_new_row["user_tendency"] = a_room["user_tendency"]
                tmp_new_row["iterations"] = a_room["iterations"]
                tmp_new_row["quick_adjust_amount"] = a_room["quick_adjust_amount"]
                new_df = pd.concat([new_df, pd.DataFrame([tmp_new_row])], ignore_index=True)

print("Trust score:", row["experiment_type"])
print(new_df)

new_df.to_csv(r"C:\Users\R\Desktop\thesis\data3\output.csv", index=False, encoding='utf-8')
