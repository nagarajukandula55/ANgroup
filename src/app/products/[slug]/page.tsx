const product = await Product.findOne({
  "seo.slug": params.slug,
}).populate("variants");
