import Container from "@/components/Container";

const Footer = () => {
  return (
    <footer className="mt-12 mb-8">
      <Container className="flex justify-between gap-4">
        <p className="text-sm">
          Solidus Kodas &copy; {new Date().getFullYear()}
        </p>
      </Container>
    </footer>
  );
};

export default Footer;