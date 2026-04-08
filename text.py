from markdown_pdf import MarkdownPdf, Section

# Define your text content
md_content = """
# Reptalk — Repository Talking AI
... [Paste your full markdown text here] ...
"""

pdf = MarkdownPdf()
# Add the content as a section
pdf.add_section(Section(md_content, toc=True))

# Set metadata
pdf.meta["title"] = "Reptalk Documentation"
pdf.meta["author"] = "Reptalk Team"

# Save
pdf.save("Reptalk_Manual.pdf")