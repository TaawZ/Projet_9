/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills";
import router from "../app/Router.js";
import NewBillUI from "../views/NewBillUI.js";
import mockStore from "../__mocks__/store";

describe("Given I am connected as an employee", () => {
	describe("When I am on Bills Page", () => {
		test("Then bill icon in vertical layout should be highlighted", async () => {
			Object.defineProperty(window, "localStorage", { value: localStorageMock });
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
				})
			);
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.Bills);
			await waitFor(() => screen.getByTestId("icon-window"));
			const windowIcon = screen.getByTestId("icon-window");
			expect(windowIcon.classList.contains("active-icon")).toBeTruthy;
		});
		test("Then bills should be ordered from earliest to latest", () => {
			document.body.innerHTML = BillsUI({ data: bills });
			const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map((a) => a.innerHTML);
			const antiChrono = (a, b) => (a < b ? 1 : -1);
			const datesSorted = [...dates].sort(antiChrono);
			expect(dates).toEqual(datesSorted);
		});
		test("Then clicking on the eye should display the img in a modal", async () => {
			const onNavigate = (pathname) => {
				document.body.innerHTML = ROUTES({
					pathname,
				});
			};
			Object.defineProperty(window, "localStorage", { value: localStorageMock });
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
				})
			);
			const billContent = new Bills({
				document,
				onNavigate,
				store: null,
				localStorage: localStorageMock,
			});
			const body = BillsUI({
				data: bills,
			});
			document.innerHTML = body;
			$.fn.modal = jest.fn();
			const handleClickIconEye = jest.fn((e) => {
				billContent.handleClickIconEye(e.target);
			});
			document.querySelector(`div[data-testid="icon-eye"]`).addEventListener("click", handleClickIconEye);
			fireEvent.click(document.querySelector(`div[data-testid="icon-eye"]`));
			expect(screen.getAllByText("Justificatif")).toBeTruthy();
		});
		test("Then clicking on the new bill button", async () => {
			const onNavigate = (pathname) => {
				document.body.innerHTML = ROUTES({
					pathname,
				});
			};
			Object.defineProperty(window, "localStorage", { value: localStorageMock });
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
				})
			);
			const billContent = new Bills({
				document,
				onNavigate,
				store: null,
				localStorage: localStorageMock,
			});
			const html = BillsUI({
				data: bills,
			});
			document.innerHTML = html;
			$.fn.modal = jest.fn();
			const handleClickNewBill = jest.fn(() => {
				billContent.handleClickNewBill();
			});
			screen.getByTestId("btn-new-bill").addEventListener("click", handleClickNewBill);
			fireEvent.click(screen.getByTestId("btn-new-bill"));
			const html2 = NewBillUI();
			document.body.innerHTML = html2;
			expect(screen.getAllByText("Envoyer une note de frais")).toBeTruthy();
		});
	});
});

//get

describe("Given i am user connected as Employee", () => {
	describe("When i navigate to the Bills page", () => {
		test("Then bills should be integrate to the body", async () => {
			localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }));
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.Bills);
			document.body.innerHTML = BillsUI({ data: bills });
			await waitFor(() => screen.getByText("Mes notes de frais"));
			const contentPending = screen.getByText("pending");
			expect(contentPending).toBeTruthy();
			const contentAccepted = screen.getByText("accepted");
			expect(contentAccepted).toBeTruthy();
			expect(screen.getAllByTestId("icon-eye")).toBeTruthy();
		});
		describe("When an error occurs on API", () => {
			beforeEach(() => {
				jest.spyOn(mockStore, "bills");
				Object.defineProperty(window, "localStorage", { value: localStorageMock });
				window.localStorage.setItem(
					"user",
					JSON.stringify({
						type: "Employee",
						email: "a@a",
					})
				);
				const root = document.createElement("div");
				root.setAttribute("id", "root");
				document.body.appendChild(root);
				router();
			});

			test("fetches bills from an API and fails with 404 message error", async () => {
				mockStore.bills.mockImplementationOnce(() => {
					return {
						list: () => {
							return Promise.reject(new Error("Erreur 404"));
						},
					};
				});
				const html = BillsUI({ error: "Erreur 404" });
				document.body.innerHTML = html;
				window.onNavigate(ROUTES_PATH.Bills);
				await new Promise(process.nextTick);
				const message = await screen.getByText(/Erreur 404/);
				expect(message).toBeTruthy();
			});

			test("fetches messages from an API and fails with 500 message error", async () => {
				mockStore.bills.mockImplementationOnce(() => {
					return {
						list: () => {
							return Promise.reject(new Error("Erreur 500"));
						},
					};
				});
				const html = BillsUI({ error: "Erreur 500" });
				document.body.innerHTML = html;
				window.onNavigate(ROUTES_PATH.Bills);
				await new Promise(process.nextTick);
				const message = await screen.getByText(/Erreur 500/);
				expect(message).toBeTruthy();
			});
		});
	});
});
