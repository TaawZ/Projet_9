/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom/extend-expect";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";

jest.mock("../app/store", () => mockStore);

const onNavigate = (pathname) => {
	document.body.innerHTML = ROUTES({ pathname });
};

describe("Given I am connected as an employee", () => {
	describe("When I am on NewBill Page", () => {
		beforeEach(() => {
			Object.defineProperty(window, "localStorage", {
				value: localStorageMock,
			});
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
					email: "employee@tld.com",
					password: "employee",
					status: "connected",
				})
			);

			document.body.innerHTML = NewBillUI();
		});
		test("Then it should display the NewBill Page", () => {
			const eltToCheck = screen.getByText("Envoyer une note de frais");
			expect(eltToCheck).toBeVisible();

			const formNewBill = screen.getByTestId("form-new-bill");
			expect(formNewBill).toBeVisible();
		});

		describe("When I click on the send button", () => {
			describe("When every fields are correctly completed", () => {
				test("Then it should redirect to the Bills Page", async () => {
					const newBill = new NewBill({
						document,
						onNavigate,
						store: mockStore,
						localStorage: window.localStorage,
					});

					const fakeFile = new File(["testimage"], "testimage.png", {
						type: "image/png",
					});

					screen.getByTestId("expense-type").value = "Fournitures de bureau";
					screen.getByTestId("expense-name").value = "Stylos";
					screen.getByTestId("datepicker").value = "2022-05-27";
					screen.getByTestId("amount").value = "42";
					screen.getByTestId("vat").value = "70";
					screen.getByTestId("pct").value = "25";
					screen.getByTestId("commentary").value = "Indispensable pour bien écrire";
					userEvent.upload(screen.getByTestId("file"), fakeFile);

					const form = screen.getByTestId("form-new-bill");
					const handleSubmitNewBill = jest.fn((e) => newBill.handleSubmit(e));
					form.addEventListener("submit", handleSubmitNewBill);

					fireEvent.submit(form);

					expect(handleSubmitNewBill).toHaveBeenCalled();

					expect(screen.getByTestId("btn-new-bill")).toBeVisible();
					expect(screen.getByText("Mes notes de frais")).toBeVisible();
				});
			});
			describe("When at least one required field is not correctly completed", () => {
				test("Then the user should stay on the current Page", async () => {
					const handleSubmit = jest.fn((e) => e);
					const form = screen.getByTestId("form-new-bill");
					form.addEventListener("submit", handleSubmit);

					screen.getByTestId("expense-type").value = "";
					screen.getByTestId("expense-name").value = "";
					screen.getByTestId("datepicker").value = "";
					expect(screen.getByTestId("datepicker")).toBeRequired();
					screen.getByTestId("amount").value = "";
					expect(screen.getByTestId("amount")).toBeRequired();
					screen.getByTestId("vat").value = "";
					screen.getByTestId("pct").value = "";
					expect(screen.getByTestId("pct")).toBeRequired();
					screen.getByTestId("commentary").value = "";

					fireEvent.submit(form);

					expect(handleSubmit).toHaveBeenCalled();

					expect(form).toBeVisible();
					expect(screen.getByText("Envoyer une note de frais")).toBeVisible();
				});
			});
		});
	});
});

describe("When I post a NewBill", () => {
	test("Then posting the NewBill from mock API POST", async () => {
		jest.spyOn(mockStore, "bills");

		const billsList = await mockStore.bills().list();

		expect(billsList.length).toBe(4);

		let bill = {
			email: "employee@tld.com",
			type: "Hôtel et logement",
			name: "Mocked bill",
			amount: "400",
			date: "2022-05-27",
			vat: "80",
			pct: "20",
			commentary: "mocked bill for POST test",
			fileUrl: "https://localhost:3456/images/test.jpg",
			fileName: "test.jpg",
			status: "pending",
		};

		mockStore.bills().create(bill);

		waitFor(() => expect(billsList.length).toBe(5));
	});
	test("fetches bills from an API and fails with 404 message error", async () => {
		jest.spyOn(mockStore, "bills");

		mockStore.bills.mockImplementationOnce(() => {
			return {
				create: () => {
					return Promise.reject(new Error("Erreur 404"));
				},
			};
		});
		document.body.innerHTML = BillsUI({ error: "Erreur 404" });
		const message = screen.getByText(/Erreur 404/);

		expect(message).toBeVisible();
	});
	test("fetches bills from an API and fails with 505 message error", async () => {
		jest.spyOn(mockStore, "bills");

		mockStore.bills.mockImplementationOnce(() => {
			return {
				create: () => {
					return Promise.reject(new Error("Erreur 500"));
				},
			};
		});
		document.body.innerHTML = BillsUI({ error: "Erreur 500" });
		const message = screen.getByText(/Erreur 500/);

		expect(message).toBeVisible();
	});
});
