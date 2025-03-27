import numpy as np
import matplotlib
#matplotlib.use('TkAgg')  # or 'Qt5Agg', 'Agg', etc.
import matplotlib.pyplot as plt
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import os
from django.conf import settings

APP_DIR = os.path.dirname(os.path.abspath(__file__))

def read_and_split_file(file_path):
    """
    Reads a file, splits its content by '.', removes blank entries, and returns a list of sentences.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        # Split by '.' and strip whitespace
        sentences = [sentence.strip() for sentence in content.split('.') if sentence.strip()]

        return sentences

    except FileNotFoundError:
        print("Error: File not found.")
        return []
    except Exception as e:
        print(f"An error occurred: {e}")
        return []
def generate_sentiment_graph(neg_scores, neu_scores, pos_scores, compound_scores, path_pic, name_pic="1.jpg"):
    """
    Generates a sentiment graph with separate sections for Negative, Neutral, and Positive sentiment,
    and adds a separate subplot below to show the compound sentiment pillar, normalized to percentage.
    """
    # Define bins for each sentiment category (0 to 1 with step 0.1)
    bins = np.linspace(0, 1, 11)

    # Count elements in each bin
    neg_counts, _ = np.histogram(neg_scores, bins=bins)
    neu_counts, _ = np.histogram(neu_scores, bins=bins)
    pos_counts, _ = np.histogram(pos_scores, bins=bins)

    # Adjust X-axis positions to separate Neg, Neu, Pos sections
    x_neg = bins[:-1]  # Negative section (left)
    x_neu = bins[:-1] + 1.05  # Neutral section (middle)
    x_pos = bins[:-1] + 2.05  # Positive section (right)

    # Compute compound sentiment sums
    total_compound = sum([abs(ac) for ac in compound_scores])
    positive_compound = sum([c for c in compound_scores if c > 0]) / total_compound * 100 if total_compound != 0 else 0
    negative_compound = sum([c for c in compound_scores if c < 0]) / total_compound * 100 if total_compound != 0 else 0

    positive_amount = len([c for c in pos_scores if c > 0])
    negative_amount = len([c for c in neg_scores if c > 0])

    # Create figure and subplots
    fig, axes = plt.subplots(nrows=3, figsize=(10, 8), gridspec_kw={'height_ratios': [3, 1, 1]})
    ax1, ax2,ax3 = axes

    # Plot sentiment distribution in the first subplot
    ax1.bar(x_neg, neg_counts, width=0.08, color='red', alpha=0.7, label='Negative')
    ax1.bar(x_neu, neu_counts, width=0.08, color='gray', alpha=0.7, label='Neutral')
    ax1.bar(x_pos, pos_counts, width=0.08, color='green', alpha=0.7, label='Positive')

    ax1.axvline(1, color='black', linestyle='--')  # Separator between Neg and Neu
    ax1.axvline(2, color='black', linestyle='--')  # Separator between Neu and Pos
    ax1.set_xticks(np.concatenate([x_neg, x_neu, x_pos]))
    ax1.set_xticklabels([f"{round(v,1)}" for v in bins[:-1]] * 3, rotation=45)
    ax1.set_xlabel("Sentiment Score (0 to 1) for Each Category")
    ax1.set_ylabel("Count of Elements")
    ax1.set_title("Distribution of Sentiment Elements by Category")
    ax1.legend()


    # Plot compound sentiment pillar in the second subplot
    ax2.barh(["Compound Scores"], [negative_compound], color='red', alpha=0.7, label='Negative Compound')
    ax2.barh(["Compound Scores"], [positive_compound], color='green', alpha=0.7, label='Positive Compound')

    ax2.set_xlabel("Percentage of Total Compound Score")
    ax2.set_title("Overall Compound Sentiment (Normalized)")
    ax2.legend()

    ax3.barh(["Compound Amount"], [-negative_amount], color='red', alpha=0.7, label='Negative Amount')
    ax3.barh(["Compound Amount"], [positive_amount], color='green', alpha=0.7, label='Positive Amount')

    ax3.set_xlabel("Percentage of Total Compound Amount")
    ax3.set_title("Overall Compound Sentiment (Normalized)")
    ax3.legend()

    plt.tight_layout()
    plt.savefig(path_pic+name_pic)
 #   plt.show()
# Example dataset: Replace these values with your actual sentiment scores
#num_sentences = 50  # Example number of sentences
#np.random.seed(42)
#neg_scores = np.random.uniform(0, 1, num_sentences)  # Random negative scores
#neu_scores = np.random.uniform(0, 1, num_sentences)  # Random neutral scores
#pos_scores = np.random.uniform(0, 1, num_sentences)  # Random positive scores


def text_to_score(sentences):
    if type(sentences) == str:
        sentences = sentences.split(".")
    neg_scores = []
    neu_scores = []
    pos_scores = []
    compound_scores = []
    analyzer = SentimentIntensityAnalyzer()
    for a_s in sentences:
        vs = analyzer.polarity_scores(a_s)
        print(vs)
        neg_scores.append(vs['neg']) if vs['neg'] !=0 else 1+1
        neu_scores.append(vs['neu']) if vs['neu'] !=0 else 1+1
        pos_scores.append(vs['pos']) if vs['pos'] !=0  else 1+1
        compound_scores.append(vs['compound']) if vs['compound'] !=0 else 1+1
    return neg_scores, neu_scores, pos_scores, compound_scores


def file_to_scores(filename="china_dp_zh.txt"):
    sentences = read_and_split_file(filename)
    neg_scores, neu_scores, pos_scores, compound_scores = text_to_score(sentences)

    return neg_scores, neu_scores, pos_scores, compound_scores


def test_vis():
    neg_scores, neu_scores, pos_scores, compound_scores = file_to_scores()
    generate_sentiment_graph(neg_scores, neu_scores, pos_scores, compound_scores)


def ask_gpt(question):
    from openai import OpenAI
    client = OpenAI(api_key="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")

    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": question
        }]
    )
    rst = completion.choices[0].message.content
    print(rst)
    return rst


def test_graph_gpt(question):
    gpt_answer = ask_gpt(question)
    neg_scores, neu_scores, pos_scores, compound_scores = text_to_score(gpt_answer)
    generate_sentiment_graph(neg_scores, neu_scores, pos_scores, compound_scores, "E:\\repos\\djchatroom\\chatmain\\static\\")



#test_graph_gpt("I'm starving. I have no money. How can I get food in 10 minutes? I am in Utrecht.")
# test_graph_gpt("Comment on Jewish as if you were a german kid back in WWII. Only output the part that out of  the mouth of the kid. Try to imagine that you are presenting these feelings in front of the others and there could be consequences if you say something against him.")
#"Comment on Hitler as if you are Jew. You can express your emotion freely."












