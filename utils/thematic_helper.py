import os
import glob
import json

import matplotlib
import pandas as pd
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from gensim import corpora, models
from collections import defaultdict
import pandas as pd
from collections import defaultdict
import matplotlib.pyplot as plt
import seaborn as sns
import json
matplotlib.use('TkAgg')
nltk.download('punkt')
nltk.download('stopwords')

def list_csv_files():
    files = glob.glob("*.csv")
    for idx, f in enumerate(files, 1):
        print(f"[{idx}] {f}")
    print(f"[{len(files)+1}] Input your path")
    print(f"[{len(files)+2}] Read an uncompleted JSON")
    print("[back] Go back")
    return files

def choose_file():
    while True:
        files = list_csv_files()
        choice = input("\\nChoose an option: ").strip()
        if choice.lower() == 'back':
            return None, None
        try:
            choice = int(choice)
            if 1 <= choice <= len(files):
                return files[choice - 1], 'csv'
            elif choice == len(files) + 1:
                return input("Enter file path: ").strip(), 'csv'
            elif choice == len(files) + 2:
                return input("Enter JSON file path: ").strip(), 'json'
        except ValueError:
            pass
        print("Invalid choice.")

def suggest_qualitative_columns(df):
    suggestions = []
    print("\\nSuggested Qualitative Columns:")
    for col in df.columns:
        if df[col].dtype == object and df[col].dropna().str.len().mean() > 20:
            preview = str(df[col].dropna().iloc[0])[:20]
            suggestions.append((col, preview))
    selected = []
    while True:
        print("\\nColumns identified:")
        for i, (col, preview) in enumerate(suggestions, 1):
            print(f"[{i}] {col}: [{preview}]")
        print(f"[{len(suggestions)+1}] Add another column")
        print("[done] Finish selection")
        print("[back] Go back")
        action = input("Select, or type '-N' to remove column N: ").strip()
        if action.lower() == 'back':
            return None
        elif action.lower() == 'done':
            return [col for col, _ in suggestions]
        elif action.startswith('-') and action[1:].isdigit():
            idx = int(action[1:]) - 1
            if 0 <= idx < len(suggestions):
                removed = suggestions.pop(idx)
                print(f"Removed column: {removed[0]}")
        else:
            return [col for col, _ in suggestions]

def get_lda_model(texts, num_topics=3):
    cleaned = [
        [word for word in word_tokenize(t.lower()) if word.isalpha() and word not in stopwords.words('english')]
        for t in texts
    ]
    dictionary = corpora.Dictionary(cleaned)
    corpus = [dictionary.doc2bow(text) for text in cleaned]
    lda = models.LdaModel(corpus, num_topics=num_topics, id2word=dictionary, passes=5)
    return lda, dictionary

def print_tag_stats(cells):
    tag_counter = defaultdict(int)
    for cell in cells:
        for tag in cell.get("tags", []):
            tag_counter[tag] += 1
    tag_list = sorted(tag_counter.items(), key=lambda x: -x[1])
    print("\\n--- Tag Statistics ---")
    for i, (tag, count) in enumerate(tag_list, 1):
        print(f"[{i}] {tag} ({count})")
    return [tag for tag, _ in tag_list]

def tag_column(col_data, lda, dictionary, save_callback):
    cells = col_data["cells"]
    for idx, cell in enumerate(cells):
        if "tags" in cell:
            continue
        text = cell["text"]
        print(f"\\n--- ({idx+1}/{len(cells)}) ---")
        print(f"Text:\\n{text}\\n")
#        bow = dictionary.doc2bow(word_tokenize(text.lower()))
#        topics = lda.get_document_topics(bow)
#        print("LDA Suggested Topics:")
#        for t in topics:
#            words = lda.show_topic(t[0], topn=3)
#            print(f"- {', '.join(w[0] for w in words)}")

        tag_ref = print_tag_stats(cells)
        tag_input = input("Tags (comma-separated, support tag numbers, Enter to skip, 'back' to return): ").strip()
        if tag_input.lower() == 'back':
            return False  # back to column selection
        elif tag_input:
            inputs = [t.strip() for t in tag_input.split(',') if t.strip()]
            final_tags = []
            for t in inputs:
                if t.isdigit():
                    idx_num = int(t) - 1
                    if 0 <= idx_num < len(tag_ref):
                        final_tags.append(tag_ref[idx_num])
                    else:
                        print(f"Ignoring unknown tag number: {t}")
                else:
                    final_tags.append(t)
            cell["tags"] = final_tags
        col_data["current_progress"] = sum(1 for cell in cells if "tags" in cell)
        save_callback()
        print(f"Progress: {idx+1}/{len(cells)}")
    return True

def save_progress(filepath, csv_path, columns_data):
    data = {
        "csv_path": csv_path,
        "columns": columns_data
    }
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

def load_progress(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

def generate_initial_structure(df, selected_columns):
    columns_data = []
    for col in selected_columns:
        col_cells = [{"text": t} for t in df[col].fillna("").astype(str).tolist()]
        columns_data.append({
            "column_name": col,
            "cells": col_cells,
            "general_info": "",
            "current_progress": 0
        })
    return columns_data

def run():
    while True:
        file_path, ftype = choose_file()
        if file_path is None:
            print("Exiting.")
            break

        if ftype == 'json':
            save_name = file_path
            progress = load_progress(file_path)
            df = pd.read_csv(progress["csv_path"])
            columns_data = progress["columns"]
        else:
            df = pd.read_csv(file_path)
            selected_columns = suggest_qualitative_columns(df)
            if selected_columns is None:
                continue
            columns_data = generate_initial_structure(df, selected_columns)
            save_name = input("Enter save file name (e.g., session.json): ").strip()

        def autosave():
            save_progress(save_name, file_path, columns_data)

        i = 0
        while i < len(columns_data):
            col_data = columns_data[i]
            col_name = col_data["column_name"]
            print(f"\\n--- Tagging Column: {col_name} ---")
            texts = [c["text"] for c in col_data["cells"]]
            lda, dictionary = get_lda_model(texts)
            continue_tagging = tag_column(col_data, lda, dictionary, autosave)
            if continue_tagging:
                i += 1  # move to next column
            else:
                break  # return to main loop

        print(f"✅ All columns completed or exited. Final save to {save_name}")
        save_progress(save_name, file_path, columns_data)


def draw_and_conclude(j_data):
    background_cells = [
        cell for column in j_data['columns']
        if column['column_name'] == 'background_colorization_open'
        for cell in column['cells']
    ]

    # Flatten all tags
    tag_counts = defaultdict(int)
    tag_text_map = defaultdict(list)

    for cell in background_cells:
        tags = cell.get("tags", [])
        for tag in tags:
            tag_counts[tag] += 1
            if cell["text"].strip():
                tag_text_map[tag].append(cell["text"].strip())

    # Convert to dataframe for display
    tag_summary_df = pd.DataFrame({
        "tag": list(tag_counts.keys()),
        "count": list(tag_counts.values()),
        "example_text": [tag_text_map[tag][0] if tag_text_map[tag] else "" for tag in tag_counts]
    }).sort_values(by="count", ascending=False)

    # Display the result
   # display_dataframe_to_user(name="Background Colorization Tag Summary", dataframe=tag_summary_df)
   # print(tag_summary_df)
    with pd.option_context('display.max_rows', None, 'display.max_columns', None, 'display.max_colwidth', None):
        print(tag_summary_df)
    # Plot tag distribution
    plt.figure(figsize=(10, 6))
    sns.barplot(data=tag_summary_df, y="tag", x="count", hue="tag", palette="viridis")
    plt.title("Tag Distribution in background_colorization_open")
    plt.xlabel("Count")
    plt.ylabel("Tag")
    plt.tight_layout()
    plt.show()


if __name__ == '__main__':
    # run()
    j_data={}
    with open("2008.json", "r", encoding="utf-8") as f:
        j_data = json.load(f)
    print(j_data.keys())
    draw_and_conclude(j_data)