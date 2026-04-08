import sys
try:
    from markdown_pdf import MarkdownPdf, Section
except ImportError:
    import subprocess
    print("Installing markdown-pdf...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "markdown-pdf"])
    from markdown_pdf import MarkdownPdf, Section

def create_pdf():
    # Read the README file
    with open("README.md", "r", encoding="utf-8") as f:
        md_content = f.read()
    
    # Create the PDF
    pdf = MarkdownPdf(toc_level=2)
    # The markdown-pdf library expects clean markdown string
    pdf.add_section(Section(md_content))
    pdf.meta["title"] = "Reptalk Documentation"
    pdf.meta["author"] = "DevTeller/Reptalk"
    
    pdf.save("Reptalk_Documentation.pdf")
    print("✅ Created Reptalk_Documentation.pdf successfully!")

if __name__ == "__main__":
    create_pdf()
